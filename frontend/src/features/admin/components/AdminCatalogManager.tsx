import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Boxes,
  CheckCircle2,
  ImagePlus,
  Layers3,
  PackagePlus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ProductVisual } from '@/ui/components';
import type { AdminProductQuickCreatePayload, CatalogCategory, CatalogCollection, Product } from '@/types';

type CatalogTab = 'products' | 'add' | 'collections';

type ProductForm = {
  name: string;
  slug: string;
  gender: Product['gender'];
  category_name: string;
  collection_name: string;
  hook: string;
  description: string;
  price: string;
  mrp: string;
  stock_qty: string;
  sku: string;
  color_name: string;
  color_hex: string;
  fabric: string;
  zari_type: string;
  image_url: string;
  deal_label: string;
  tags_text: string;
  occasions_text: string;
  is_featured: boolean;
  blouse_included: boolean;
};

const initialProductForm: ProductForm = {
  name: '',
  slug: '',
  gender: 'women',
  category_name: 'Kanjivaram',
  collection_name: 'Fresh Arrivals',
  hook: '',
  description: '',
  price: '',
  mrp: '',
  stock_qty: '10',
  sku: '',
  color_name: 'Ruby',
  color_hex: '#842033',
  fabric: 'Pure silk',
  zari_type: 'Gold zari',
  image_url: '',
  deal_label: 'New arrival',
  tags_text: 'kanjivaram, pure silk',
  occasions_text: 'Wedding, Festival',
  is_featured: true,
  blouse_included: true,
};

const inr = (value?: number | string) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function AdminCatalogManager() {
  const [tab, setTab] = useState<CatalogTab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [collections, setCollections] = useState<CatalogCollection[]>([]);
  const [form, setForm] = useState<ProductForm>(initialProductForm);
  const [collectionForm, setCollectionForm] = useState({ name: '', description: '', is_featured: true });
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const [productData, categoryData, collectionData] = await Promise.all([
        api.admin.products(),
        api.admin.categories(),
        api.admin.collections(),
      ]);
      setProducts(productData.items);
      setCategories(categoryData);
      setCollections(collectionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = window.setTimeout(() => void loadCatalog(), 0);
    return () => window.clearTimeout(id);
  }, []);

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(product =>
      [product.name, product.cat, product.slug, product.variants?.[0]?.sku]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(needle)),
    );
  }, [products, query]);

  const previewProduct: Partial<Product> = {
    id: 0,
    slug: form.slug || toSlug(form.name) || 'new-product',
    name: form.name || 'New CSM silk product',
    cat: form.category_name || 'Collection',
    price: Number(form.price || 0),
    mrp: Number(form.mrp || form.price || 0),
    gender: form.gender,
    hook: form.hook || form.fabric,
    colors: [form.color_hex || '#842033', '#C4923A', '#0C604F'],
    images: form.image_url ? [form.image_url] : [],
  };

  const createProduct = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const payload: AdminProductQuickCreatePayload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        gender: form.gender,
        category_name: form.category_name.trim(),
        collection_name: form.collection_name.trim(),
        hook: form.hook.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        mrp: Number(form.mrp || form.price),
        stock_qty: Number(form.stock_qty || 0),
        sku: form.sku.trim() || undefined,
        color_name: form.color_name.trim(),
        color_hex: form.color_hex.trim(),
        fabric: form.fabric.trim(),
        zari_type: form.zari_type.trim(),
        image_url: form.image_url.trim(),
        deal_label: form.deal_label.trim(),
        tags_text: form.tags_text.trim(),
        occasions_text: form.occasions_text.trim(),
        is_featured: form.is_featured,
        blouse_included: form.blouse_included,
        is_active: true,
        assured: true,
        cod_available: true,
        exchange_available: true,
        return_days: 15,
      };
      if (!payload.name || !payload.category_name || !payload.price || !payload.mrp) {
        throw new Error('Name, category, price, and MRP are required.');
      }
      const created = await api.admin.createProductQuick(payload);
      setProducts(prev => [created, ...prev]);
      setForm(initialProductForm);
      setNotice(`${created.name} is live in the customer catalog with ${created.available_qty || 0} stock.`);
      setTab('products');
      void loadCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create product');
    } finally {
      setSaving(false);
    }
  };

  const createCollection = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const name = collectionForm.name.trim();
      if (!name) throw new Error('Collection name is required.');
      const collection = await api.admin.createCollection({
        name,
        slug: toSlug(name),
        description: collectionForm.description.trim(),
        is_featured: collectionForm.is_featured,
      });
      setCollections(prev => [collection, ...prev]);
      setCollectionForm({ name: '', description: '', is_featured: true });
      setNotice(`${collection.name} collection is ready for product assignment.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create collection');
    } finally {
      setSaving(false);
    }
  };

  const totalStock = products.reduce((sum, product) => sum + Number(product.available_qty || 0), 0);
  const activeCount = products.filter(product => Number(product.available_qty || 0) > 0).length;
  const featuredCount = products.filter(product => product.is_featured).length;

  return (
    <div className="admin-catalog">
      <div className="admin-panel-head">
        <div>
          <span className="admin-eyebrow">Catalog operations</span>
          <h2>Products, collections, and live stock</h2>
          <p>Create a SKU with stock and image once. Customers see it immediately in search, women, men, and product detail pages.</p>
        </div>
        <div className="admin-head-actions">
          <button className="admin-soft-btn" onClick={() => void loadCatalog()} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="admin-primary-btn" onClick={() => setTab('add')}>
            <PackagePlus size={16} /> Add product
          </button>
        </div>
      </div>

      {(notice || error) && (
        <div className={`admin-alert ${error ? 'bad' : 'good'}`}>
          {error ? error : notice}
        </div>
      )}

      <div className="admin-tabs">
        {[
          ['products', Boxes, 'Products'],
          ['add', PackagePlus, 'Add product'],
          ['collections', Layers3, 'Collections'],
        ].map(([key, Icon, label]) => {
          const IconComp = Icon as typeof Boxes;
          return (
            <button key={key as string} className={tab === key ? 'active' : ''} onClick={() => setTab(key as CatalogTab)}>
              <IconComp size={16} /> {label as string}
            </button>
          );
        })}
      </div>

      {tab === 'products' && (
        <div className="admin-stack">
          <div className="admin-metric-row">
            <div className="admin-mini-metric"><span>Total products</span><strong>{products.length}</strong></div>
            <div className="admin-mini-metric"><span>Buyable SKUs</span><strong>{activeCount}</strong></div>
            <div className="admin-mini-metric"><span>Available stock</span><strong>{totalStock}</strong></div>
            <div className="admin-mini-metric"><span>Featured</span><strong>{featuredCount}</strong></div>
          </div>
          <div className="admin-table-toolbar">
            <label className="admin-search">
              <Search size={16} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search product, SKU, category" />
            </label>
            <span>{filteredProducts.length} visible</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table catalog-table">
              <thead><tr><th>Product</th><th>Collection</th><th>Variant</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
              <tbody>
                {filteredProducts.map(product => {
                  const variant = product.variants?.[0];
                  const stock = Number(product.available_qty || 0);
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="admin-product-cell">
                          <ProductVisual product={product} className="admin-thumb" />
                          <div>
                            <strong>{product.name}</strong>
                            <span>{product.cat} / {product.gender}</span>
                          </div>
                        </div>
                      </td>
                      <td>{product.collections?.[0]?.name || 'Default'}</td>
                      <td>
                        <strong>{variant?.sku || '-'}</strong>
                        <span className="admin-muted-line">{variant?.fabric || product.tags?.[0] || 'Pure silk'}</span>
                      </td>
                      <td>
                        <strong>{inr(product.price)}</strong>
                        {product.mrp > product.price && <span className="admin-muted-line">{inr(product.mrp)} MRP</span>}
                      </td>
                      <td>{stock}</td>
                      <td><span className={`status-badge ${stock > 0 ? 'st-delivered' : 'st-pending'}`}>{stock > 0 ? 'Live' : 'Out'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'add' && (
        <form className="admin-create-grid" onSubmit={createProduct}>
          <div className="admin-form-card">
            <div className="chart-title"><PackagePlus size={18} /> New product</div>
            <div className="admin-form-grid">
              <label className="admin-field wide">Product name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Royal Kanjivaram Bridal Saree" /></label>
              <label className="admin-field">Slug<input value={form.slug} onChange={e => setForm({ ...form, slug: toSlug(e.target.value) })} placeholder={toSlug(form.name) || 'auto-created'} /></label>
              <label className="admin-field">Gender
                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as Product['gender'] })}>
                  <option value="women">Women</option>
                  <option value="men">Men</option>
                  <option value="unisex">Unisex</option>
                </select>
              </label>
              <label className="admin-field">Category
                <input list="catalog-categories" value={form.category_name} onChange={e => setForm({ ...form, category_name: e.target.value })} />
              </label>
              <label className="admin-field">Collection
                <input list="catalog-collections" value={form.collection_name} onChange={e => setForm({ ...form, collection_name: e.target.value })} />
              </label>
              <label className="admin-field wide">Short selling line<input value={form.hook} onChange={e => setForm({ ...form, hook: e.target.value })} placeholder="Temple border pure silk with rich gold zari" /></label>
              <label className="admin-field wide">Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe fabric, zari, blouse, occasion, and quality details." /></label>
            </div>

            <div className="admin-form-section">Pricing and SKU</div>
            <div className="admin-form-grid">
              <label className="admin-field">Selling price<input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></label>
              <label className="admin-field">MRP<input type="number" min="0" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} /></label>
              <label className="admin-field">Opening stock<input type="number" min="0" value={form.stock_qty} onChange={e => setForm({ ...form, stock_qty: e.target.value })} /></label>
              <label className="admin-field">SKU<input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })} placeholder="Auto if blank" /></label>
              <label className="admin-field">Color name<input value={form.color_name} onChange={e => setForm({ ...form, color_name: e.target.value })} /></label>
              <label className="admin-field color-field">Color swatch<input type="color" value={form.color_hex} onChange={e => setForm({ ...form, color_hex: e.target.value })} /></label>
              <label className="admin-field">Fabric<input value={form.fabric} onChange={e => setForm({ ...form, fabric: e.target.value })} /></label>
              <label className="admin-field">Zari type<input value={form.zari_type} onChange={e => setForm({ ...form, zari_type: e.target.value })} /></label>
            </div>

            <div className="admin-form-section">Merchandising</div>
            <div className="admin-form-grid">
              <label className="admin-field wide">Image URL<input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></label>
              <label className="admin-field">Deal label<input value={form.deal_label} onChange={e => setForm({ ...form, deal_label: e.target.value })} /></label>
              <label className="admin-field">Tags<input value={form.tags_text} onChange={e => setForm({ ...form, tags_text: e.target.value })} /></label>
              <label className="admin-field">Occasions<input value={form.occasions_text} onChange={e => setForm({ ...form, occasions_text: e.target.value })} /></label>
              <label className="admin-check"><input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} /> Featured on home</label>
              <label className="admin-check"><input type="checkbox" checked={form.blouse_included} onChange={e => setForm({ ...form, blouse_included: e.target.checked })} /> Blouse included</label>
            </div>

            <datalist id="catalog-categories">
              {categories.map(category => <option key={category.id} value={category.name} />)}
            </datalist>
            <datalist id="catalog-collections">
              {collections.map(collection => <option key={collection.id} value={collection.name} />)}
            </datalist>

            <button className="admin-primary-btn admin-submit" type="submit" disabled={saving}>
              <Save size={16} /> {saving ? 'Publishing...' : 'Publish to customer store'}
            </button>
          </div>

          <aside className="admin-preview-panel">
            <div className="chart-title"><ImagePlus size={18} /> Customer preview</div>
            <ProductVisual product={previewProduct} className="admin-preview-visual" />
            <div className="admin-preview-copy">
              <span>{previewProduct.cat}</span>
              <strong>{previewProduct.name}</strong>
              <p>{previewProduct.hook || 'Pure silk textile from CSM Silks.'}</p>
              <div><b>{inr(previewProduct.price)}</b>{Number(previewProduct.mrp) > Number(previewProduct.price) && <em>{inr(previewProduct.mrp)}</em>}</div>
            </div>
            <div className="admin-preview-note">
              <CheckCircle2 size={18} /> Active product, live SKU stock, COD, returns, and CSM Assured are enabled.
            </div>
          </aside>
        </form>
      )}

      {tab === 'collections' && (
        <div className="admin-create-grid compact">
          <form className="admin-form-card" onSubmit={createCollection}>
            <div className="chart-title"><Layers3 size={18} /> New collection</div>
            <label className="admin-field wide">Collection name<input value={collectionForm.name} onChange={e => setCollectionForm({ ...collectionForm, name: e.target.value })} placeholder="Wedding Silk Edit" /></label>
            <label className="admin-field wide">Description<textarea value={collectionForm.description} onChange={e => setCollectionForm({ ...collectionForm, description: e.target.value })} placeholder="Short collection description for admin organization." /></label>
            <label className="admin-check"><input type="checkbox" checked={collectionForm.is_featured} onChange={e => setCollectionForm({ ...collectionForm, is_featured: e.target.checked })} /> Featured collection</label>
            <button className="admin-primary-btn admin-submit" type="submit" disabled={saving}><Sparkles size={16} /> Create collection</button>
          </form>
          <div className="admin-form-card">
            <div className="chart-title">Existing collections</div>
            <div className="admin-collection-list">
              {collections.map(collection => (
                <div key={collection.id} className="admin-collection-row">
                  <div>
                    <strong>{collection.name}</strong>
                    <span>{collection.description || collection.slug}</span>
                  </div>
                  {collection.is_featured && <span className="status-badge st-delivered">Featured</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
