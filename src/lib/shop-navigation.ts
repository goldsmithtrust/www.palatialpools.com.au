/** No ecommerce code here: the edge owns /shop; this only fixes links. */
export function withShopNavigation(html: string): string {
  if (process.env.SHOP_SAME_DOMAIN !== '1') return html;
  const script = '<script defer src="/assets/pp-shop-navigation.js"></script>';
  return html.includes('</body>') ? html.replace('</body>', `${script}</body>`) : `${html}${script}`;
}
