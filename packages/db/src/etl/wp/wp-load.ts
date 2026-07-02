/**
 * Load everything the ETL needs from the WP dump in ONE streaming pass.
 * Only whitelisted tables / meta keys are kept, so memory stays modest.
 */
import { iterInserts, type Field } from "./dump-parser";

export interface WpPost {
  id: string;
  type: string;
  status: string;
  title: string;
  name: string; // slug
  content: string;
  excerpt: string;
  parent: string;
  guid: string;
  menuOrder: number;
  date: string;
}

export interface WpOrder {
  id: string;
  status: string;
  currency: string | null;
  total: string | null;
  customerId: string;
  billingEmail: string | null;
  dateCreated: string | null;
  paymentMethod: string | null;
  paymentMethodTitle: string | null;
  customerNote: string | null;
}

export interface WpOrderItem {
  itemId: string;
  orderId: string;
  name: string;
  type: string;
}

export interface WpData {
  posts: Map<string, WpPost>; // products, variations, attachments, coupons
  postmeta: Map<string, Map<string, string>>; // post_id -> key -> value
  terms: Map<string, { name: string; slug: string }>;
  productCats: Map<string, { termId: string; parent: string }>; // tt_id keyed
  termParents: Map<string, string>; // term_id -> parent term_id
  termThumbs: Map<string, string>; // term_id -> attachment id
  productTerms: Map<string, Set<string>>; // product post_id -> term_ids (product_cat)
  primaryTerm: Map<string, string>; // product post_id -> primary term_id
  users: Map<string, { login: string; email: string; registered: string; displayName: string }>;
  usermeta: Map<string, Map<string, string>>; // user_id -> key -> value
  orders: Map<string, WpOrder>;
  orderAddresses: Map<string, { billing?: Record<string, string>; shipping?: Record<string, string> }>;
  orderItems: WpOrderItem[];
  orderItemMeta: Map<string, Map<string, string>>; // item_id -> key -> value
}

const POST_TYPES = new Set(["product", "product_variation", "attachment"]);
const POSTMETA_KEYS = new Set([
  "_price", "_regular_price", "_sale_price", "_sku", "_stock", "_stock_status",
  "_manage_stock", "_low_stock_amount", "_thumbnail_id", "_product_image_gallery",
  "_weight",
]);
const USERMETA_KEYS = new Set([
  "wp_capabilities", "billing_phone", "billing_first_name", "billing_last_name",
  "billing_address_1", "billing_address_2", "billing_city", "billing_state",
  "billing_postcode", "first_name", "last_name",
]);
const ORDER_ITEM_META = new Set([
  "_qty", "_line_total", "_line_subtotal", "_product_id", "_variation_id",
]);
const ADDRESS_FIELDS = [
  "first_name", "last_name", "company", "address_1", "address_2",
  "city", "state", "postcode", "country", "email", "phone",
] as const;

const TABLES = new Set([
  "wp_posts", "wp_postmeta", "wp_terms", "wp_term_taxonomy",
  "wp_term_relationships", "wp_termmeta", "wp_yoast_primary_term",
  "wp_users", "wp_usermeta", "wp_wc_orders", "wp_wc_order_addresses",
  "wp_woocommerce_order_items", "wp_woocommerce_order_itemmeta",
]);

const s = (f: Field | undefined): string => f ?? "";
const n = (f: Field | undefined): string | null => f ?? null;

/** Meta keys that variation attribute values live under (attribute_*). */
const isVariationAttr = (k: string) => k.startsWith("attribute_");

export async function loadWpData(dumpPath: string): Promise<WpData> {
  const d: WpData = {
    posts: new Map(),
    postmeta: new Map(),
    terms: new Map(),
    productCats: new Map(),
    termParents: new Map(),
    termThumbs: new Map(),
    productTerms: new Map(),
    primaryTerm: new Map(),
    users: new Map(),
    usermeta: new Map(),
    orders: new Map(),
    orderAddresses: new Map(),
    orderItems: [],
    orderItemMeta: new Map(),
  };
  const rel: [string, string][] = []; // (object_id, tt_id) — resolved after

  for await (const { table, rows } of iterInserts(dumpPath, TABLES)) {
    switch (table) {
      case "wp_posts":
        for (const r of rows) {
          const type = s(r[20]);
          if (!POST_TYPES.has(type)) continue;
          d.posts.set(s(r[0]), {
            id: s(r[0]), type, status: s(r[7]), title: s(r[5]), name: s(r[11]),
            content: s(r[4]), excerpt: s(r[6]), parent: s(r[17]), guid: s(r[18]),
            menuOrder: Number(s(r[19]) || 0), date: s(r[2]),
          });
        }
        break;
      case "wp_postmeta":
        for (const r of rows) {
          const key = s(r[2]);
          if (!POSTMETA_KEYS.has(key) && !isVariationAttr(key)) continue;
          const pid = s(r[1]);
          let m = d.postmeta.get(pid);
          if (!m) d.postmeta.set(pid, (m = new Map()));
          m.set(key, s(r[3]));
        }
        break;
      case "wp_terms":
        for (const r of rows) d.terms.set(s(r[0]), { name: s(r[1]), slug: s(r[2]) });
        break;
      case "wp_term_taxonomy":
        for (const r of rows) {
          if (s(r[2]) !== "product_cat") continue;
          d.productCats.set(s(r[0]), { termId: s(r[1]), parent: s(r[4]) });
          d.termParents.set(s(r[1]), s(r[4]));
        }
        break;
      case "wp_term_relationships":
        for (const r of rows) rel.push([s(r[0]), s(r[1])]);
        break;
      case "wp_termmeta":
        for (const r of rows) {
          if (s(r[2]) === "thumbnail_id") d.termThumbs.set(s(r[1]), s(r[3]));
        }
        break;
      case "wp_yoast_primary_term":
        // columns: id, post_id, term_id, taxonomy, blog_id, ...
        for (const r of rows) {
          if (s(r[3]) === "product_cat") d.primaryTerm.set(s(r[1]), s(r[2]));
        }
        break;
      case "wp_users":
        for (const r of rows) {
          d.users.set(s(r[0]), {
            login: s(r[1]), email: s(r[4]), registered: s(r[6]), displayName: s(r[9]),
          });
        }
        break;
      case "wp_usermeta":
        for (const r of rows) {
          const key = s(r[2]);
          if (!USERMETA_KEYS.has(key)) continue;
          const uid = s(r[1]);
          let m = d.usermeta.get(uid);
          if (!m) d.usermeta.set(uid, (m = new Map()));
          m.set(key, s(r[3]));
        }
        break;
      case "wp_wc_orders":
        for (const r of rows) {
          if (s(r[3]) !== "shop_order") continue;
          d.orders.set(s(r[0]), {
            id: s(r[0]), status: s(r[1]), currency: n(r[2]), total: n(r[5]),
            customerId: s(r[6]), billingEmail: n(r[7]), dateCreated: n(r[8]),
            paymentMethod: n(r[11]), paymentMethodTitle: n(r[12]), customerNote: n(r[16]),
          });
        }
        break;
      case "wp_wc_order_addresses":
        for (const r of rows) {
          const oid = s(r[1]);
          const kind = s(r[2]) as "billing" | "shipping";
          const addr: Record<string, string> = {};
          ADDRESS_FIELDS.forEach((f, i) => {
            const v = r[3 + i] ?? null;
            if (v) addr[f] = v;
          });
          const cur = d.orderAddresses.get(oid) ?? {};
          cur[kind] = addr;
          d.orderAddresses.set(oid, cur);
        }
        break;
      case "wp_woocommerce_order_items":
        for (const r of rows) {
          if (s(r[2]) !== "line_item") continue;
          d.orderItems.push({ itemId: s(r[0]), name: s(r[1]), type: s(r[2]), orderId: s(r[3]) });
        }
        break;
      case "wp_woocommerce_order_itemmeta":
        for (const r of rows) {
          const key = s(r[2]);
          if (!ORDER_ITEM_META.has(key)) continue;
          const iid = s(r[1]);
          let m = d.orderItemMeta.get(iid);
          if (!m) d.orderItemMeta.set(iid, (m = new Map()));
          m.set(key, s(r[3]));
        }
        break;
    }
  }

  // resolve product -> category term ids (products are known now)
  for (const [objectId, ttId] of rel) {
    const cat = d.productCats.get(ttId);
    if (!cat) continue;
    const post = d.posts.get(objectId);
    if (!post || post.type !== "product") continue;
    let set = d.productTerms.get(objectId);
    if (!set) d.productTerms.set(objectId, (set = new Set()));
    set.add(cat.termId);
  }
  return d;
}
