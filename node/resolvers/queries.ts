export const QUERIES = {
  searchProducts: /* GraphQL */ `
    query getProduct($refId: ID!) {
      product(identifier: { field: reference, value: "5869796" }) {
        linkText
        productId
      }
    }
  `,
}
