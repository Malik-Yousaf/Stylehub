import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data/staticData";
import ProductCard from "../components/ProductCard.jsx";
import { fmt } from "../utils";

export default function Shop() {
  const { products } = useApp();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [categories, setCategories] = useState(new Set(location.state?.category ? [location.state.category] : []));
  const [sizes, setSizes] = useState(new Set());
  const [colors, setColors] = useState(new Set());
  const [maxPrice, setMaxPrice] = useState(20000);
  const [sort, setSort] = useState("popularity");

  useEffect(() => {
    if (location.state?.category) setCategories(new Set([location.state.category]));
  }, [location.state]);

  function toggleSet(setFn, val) {
    setFn((prev) => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  }

  function resetFilters() {
    setSearch("");
    setCategories(new Set());
    setSizes(new Set());
    setColors(new Set());
    setMaxPrice(20000);
    setSort("popularity");
  }

  const allSizes = useMemo(() => [...new Set(products.flatMap((p) => p.sizes))].filter((s) => s !== "One Size"), [products]);
  const allColors = useMemo(() => [...new Set(products.flatMap((p) => p.colors))], [products]);

  const list = useMemo(() => {
    let l = products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categories.size && !categories.has(p.cat)) return false;
      if (sizes.size && !p.sizes.some((s) => sizes.has(s))) return false;
      if (colors.size && !p.colors.some((c) => colors.has(c))) return false;
      if (p.price > maxPrice) return false;
      return true;
    });
    if (sort === "price-asc") l = [...l].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") l = [...l].sort((a, b) => b.price - a.price);
    else if (sort === "newest") l = [...l].sort((a, b) => b.isNew - a.isNew);
    else l = [...l].sort((a, b) => b.popularity - a.popularity);
    return l;
  }, [products, search, categories, sizes, colors, maxPrice, sort]);

  return (
    <div className="page active" id="page-shop">
      <div className="pageheader">
        <div className="wrap">
          <div className="crumb"><Link to="/">Home</Link> / Shop</div>
          <h1>Shop All</h1>
        </div>
      </div>
      <section style={{ paddingTop: 44 }}>
        <div className="wrap">
          <div className="shop-layout">
            <aside className="filters">
              <div className="filter-block">
                <h4>Category</h4>
                <div>
                  {CATEGORIES.map((c) => (
                    <label className="check-row" key={c}>
                      <input type="checkbox" checked={categories.has(c)} onChange={() => toggleSet(setCategories, c)} />
                      {c}<span className="count">{products.filter((p) => p.cat === c).length}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="filter-block">
                <h4>Price range <span className="clear-filters" style={{ cursor: "pointer", fontWeight: 400 }} onClick={resetFilters}>Reset all</span></h4>
                <input type="range" min="1000" max="20000" step="500" className="price-range" value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} />
                <div className="price-range-vals"><span>Rs. 1,000</span><span>{fmt(maxPrice)}</span></div>
              </div>
              <div className="filter-block">
                <h4>Size</h4>
                <div className="size-grid">
                  {allSizes.map((s) => (
                    <button key={s} className={"size-opt" + (sizes.has(s) ? " selected" : "")} onClick={() => toggleSet(setSizes, s)}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="filter-block">
                <h4>Color</h4>
                <div className="color-grid">
                  {allColors.map((c) => (
                    <button key={c} className={"color-opt" + (colors.has(c) ? " selected" : "")} style={{ background: c, borderColor: colors.has(c) ? "#000" : "transparent" }} onClick={() => toggleSet(setColors, c)}></button>
                  ))}
                </div>
              </div>
            </aside>
            <div>
              <div className="shop-toolbar">
                <div className="count">{list.length} product{list.length !== 1 ? "s" : ""}</div>
                <div className="toolbar-right">
                  <div className="select-wrap">
                    <select value={sort} onChange={(e) => setSort(e.target.value)}>
                      <option value="popularity">Sort: Popularity</option>
                      <option value="newest">Sort: Newest</option>
                      <option value="price-asc">Sort: Price (Low–High)</option>
                      <option value="price-desc">Sort: Price (High–Low)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="prod-grid">
                {list.length ? list.map((p) => <ProductCard key={p.id} p={p} />) : (
                  <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
                    No products match your filters. <a href="#" onClick={(e) => { e.preventDefault(); resetFilters(); }} style={{ textDecoration: "underline" }}>Clear filters</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
