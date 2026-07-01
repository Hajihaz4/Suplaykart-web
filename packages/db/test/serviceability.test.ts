import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  bulkAddPincodes,
  checkServiceability,
  createServiceableArea,
  deleteServiceableArea,
  getServiceConfig,
  haversineKm,
  listServiceableAreas,
  setServiceableAreaActive,
  updateServiceConfig,
  updateServiceableArea,
} from "../src/dal/serviceability";
import { type TestDb, makeSupplier, makeTestDb, makeUser } from "./harness";

describe("haversine (radius math)", () => {
  it("is 0 for identical points and ~111km per degree at the equator", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.19, 0);
  });
});

describe("serviceability DAL", () => {
  let t: TestDb;
  let S: string;
  let other: string;
  let admin: string;

  beforeAll(async () => {
    t = await makeTestDb();
    S = await makeSupplier(t.db);
    other = await makeSupplier(t.db);
    admin = await makeUser(t.db, { role: "owner" });
  });
  afterAll(() => t.close());

  it("defaults to unrestricted ('all') with no config row", async () => {
    const cfg = await getServiceConfig(t.db, S);
    expect(cfg.mode).toBe("all");
    const r = await checkServiceability(t.db, S, { pincode: "999999" });
    expect(r.serviceable).toBe(true);
    expect(r.reason).toBe("unrestricted");
  });

  it("CRUD + pincode-mode gating", async () => {
    await updateServiceConfig(t.db, S, admin, { mode: "pincode", radiusKm: 0 });

    // unknown pincode → blocked
    expect((await checkServiceability(t.db, S, { pincode: "611002" })).reason).toBe(
      "out_of_zone",
    );

    // create a live area → serviceable
    const live = await createServiceableArea(t.db, S, admin, {
      pincode: "611002",
      city: "Nagore",
      areaName: "Main Road",
      status: "live",
    });
    expect(live?.status).toBe("live");
    const ok = await checkServiceability(t.db, S, { pincode: "611002" });
    expect(ok.serviceable).toBe(true);
    expect(ok.status).toBe("live");

    // duplicate pincode → null
    expect(
      await createServiceableArea(t.db, S, admin, {
        pincode: "611002",
        city: "Nagore",
        status: "live",
      }),
    ).toBeNull();

    // coming_soon area → blocked with reason
    await createServiceableArea(t.db, S, admin, {
      pincode: "611001",
      city: "Nagapattinam",
      status: "coming_soon",
      expectedLaunch: "Aug 2026",
    });
    const soon = await checkServiceability(t.db, S, { pincode: "611001" });
    expect(soon.serviceable).toBe(false);
    expect(soon.reason).toBe("coming_soon");
    expect(soon.expectedLaunch).toBe("Aug 2026");
  });

  it("disabling an area removes serviceability", async () => {
    const areas = await listServiceableAreas(t.db, S);
    const live = areas.find((a) => a.pincode === "611002")!;
    await setServiceableAreaActive(t.db, S, admin, live.id, false);
    expect((await checkServiceability(t.db, S, { pincode: "611002" })).reason).toBe(
      "out_of_zone",
    );
    await setServiceableAreaActive(t.db, S, admin, live.id, true);
  });

  it("enforces supplier ownership on mutations", async () => {
    const areas = await listServiceableAreas(t.db, S);
    const a = areas[0]!;
    expect(
      await updateServiceableArea(t.db, other, admin, a.id, {
        pincode: "000000",
        city: "X",
        status: "live",
      }),
    ).toBeNull();
    expect(await deleteServiceableArea(t.db, other, admin, a.id)).toBe(false);
  });

  it("bulk-adds pincodes, skipping duplicates", async () => {
    const added = await bulkAddPincodes(t.db, S, admin, {
      pincodes: ["611002", "611003", "611004"], // 611002 already exists
      city: "Nagore",
      status: "live",
    });
    expect(added).toBe(2);
  });

  it("radius mode: serviceable within radius, blocked outside", async () => {
    await updateServiceConfig(t.db, S, admin, {
      mode: "radius",
      originLat: 0,
      originLng: 0,
      radiusKm: 100,
    });
    const near = await checkServiceability(t.db, S, { lat: 0, lng: 0.5 }); // ~55 km
    expect(near.serviceable).toBe(true);
    const far = await checkServiceability(t.db, S, { lat: 0, lng: 2 }); // ~222 km
    expect(far.serviceable).toBe(false);
    expect(far.reason).toBe("out_of_radius");
  });

  it("radius mode without coords falls back to pincode", async () => {
    // still radius mode, but no lat/lng → pincode gate applies
    const r = await checkServiceability(t.db, S, { pincode: "611003" });
    expect(r.serviceable).toBe(true); // 611003 was bulk-added as live
  });
});
