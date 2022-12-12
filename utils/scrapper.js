export const scrapper = async () => {
  const res = {};
  res.prods = [];
  let scaned = 0;
  const timeOut = 10000;
  const pages = 10;

  const urlHash = "cwqVaeSG7OW4j1PiVPK9y";

  for (let index = 1; index < pages; index++) {
    fetch(
      `https://www.klekt.com/_next/data/${urlHash}/eu/list.json?page=${index}&categories=sneakers&category=sneakers`
    )
      .then((response) => response.json())
      .then((data) => {
        const freeProduct = data.pageProps.plpData.data.search.items.filter(
          (i) => i.description.includes("CODE")
        );

        if (freeProduct.length !== 0) {
          res.prods = [...res.prods, freeProduct.flat()];

          const code = freeProduct[0].description.slice(
            3,
            freeProduct[0].description.indexOf("<br>")
          );

          res.page = index;
          res.code = code;
          res.url = `https://www.klekt.com/product/${freeProduct[0].slug}`;
        }
      });
    scaned = index;
  }
  await new Promise((r) => setTimeout(r, timeOut));
  res.qty = res.prods.length;

  res.prods = res.prods.flat();

  let final = {};

  let finalProds = [];

  res.prods.forEach((p) => {
    const singleProd = {
      fullProduct: p,
      code: p.description.slice(3, p.description.indexOf("<br>")),
      url: `https://www.klekt.com/product/${p.slug}`,
    };

    finalProds = [...finalProds, singleProd];
  });

  final.scaned = scaned;
  final.products = finalProds;
  return final;
};
