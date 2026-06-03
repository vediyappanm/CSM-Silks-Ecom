import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/store/AppContext';
import { ProductVisual } from '@/ui/components';
import type { Product } from '@/types';

const skinOptions = [
  { label: 'Fair', color: '#F5D5B8' },
  { label: 'Wheatish', color: '#D4A574' },
  { label: 'Medium', color: '#C17F4A' },
  { label: 'Dusky', color: '#8B5A2B' },
  { label: 'Deep', color: '#5C3317' },
];

const bodyOptions = ['Petite', 'Regular', 'Tall', 'Plus'];
const drapeOptions = ['Nivi', 'Bengali', 'Gujarati', 'Coorgi', 'Nauvari', 'Kasavu', 'Madisar', 'Mumtaz'];

export function TryOn() {
  const navigate = useNavigate();
  const { addToCart, showToast } = useApp();
  const [skin, setSkin] = useState('Wheatish');
  const [body, setBody] = useState('Regular');
  const [drape, setDrape] = useState('Nivi');
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestedProduct, setSuggestedProduct] = useState<Product | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoMediaType, setPhotoMediaType] = useState('image/jpeg');
  const [aiResult, setAiResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.products.list({ gender: 'women', featured: true, per_page: 1 })
      .then(async data => {
        if (data.items[0]) return data.items[0];
        const firstAvailable = await api.products.list({ gender: 'women', per_page: 1 });
        return firstAvailable.items[0] || null;
      })
      .then(setSuggestedProduct)
      .catch(() => setSuggestedProduct(null));
  }, []);

  const handlePhotoUpload = (file?: File) => {
    if (!file) return;
    setPhotoMediaType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      setPhotoPreview(value);
      setPhotoBase64(value.includes(',') ? value.split(',')[1] : value);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!photoBase64) {
      showToast('!', 'Photo required', 'Upload a customer photo to run real AI vision styling');
      return;
    }
    setLoading(true);
    try {
      const result = await api.ai.tryon({
        product_id: suggestedProduct?.id,
        product_image_url: suggestedProduct?.images?.[0],
        skin_tone: skin,
        body_type: body,
        drape_style: drape,
        occasion: 'occasion wear',
        user_photo_base64: photoBase64,
        user_photo_media_type: photoMediaType,
      });
      setAiResult(result);
      setGenerated(true);
      showToast('OK', result.provider === 'anthropic' ? 'AI styling ready' : 'Styling ready', 'Your draping and styling recommendation is ready');
    } catch (err) {
      showToast('!', 'Try-on failed', err instanceof Error ? err.message : 'Unable to generate styling notes');
    } finally {
      setLoading(false);
    }
  };

  const addSuggested = async () => {
    if (!suggestedProduct) {
      showToast('!', 'No suggestion available', 'Browse the saree catalog to pick a live SKU');
      navigate('/womens');
      return;
    }
    await addToCart(suggestedProduct);
  };

  return (
    <div className="tryon-page">
      <div className="tryon-shell">
        <div className="tryon-head">
          <button className="back-btn" onClick={() => navigate('/')} aria-label="Back home">
            <ArrowLeft size={18} />
            <span className="back-btn-label">Home</span>
          </button>
          <div>
            <span>Interactive studio</span>
            <h1>AI virtual try-on</h1>
          </div>
        </div>

        <div className="tryon-grid">
          <section className="tryon-controls" aria-label="Try-on controls">
            <div className="tryon-panel">
              <div className="tryon-panel-title">1. Select skin tone</div>
              <div className="skin-options">
                {skinOptions.map(option => (
                  <button key={option.label} type="button" className={`skin-choice ${skin === option.label ? 'on' : ''}`} onClick={() => setSkin(option.label)}>
                    <span style={{ background: option.color }} />
                    <strong>{option.label}</strong>
                  </button>
                ))}
              </div>
            </div>

            <div className="tryon-panel">
              <div className="tryon-panel-title">2. Body frame</div>
              <div className="pill-options">
                {bodyOptions.map(option => (
                  <button key={option} type="button" className={body === option ? 'on' : ''} onClick={() => setBody(option)}>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="tryon-panel">
              <div className="tryon-panel-title">3. Draping style</div>
              <div className="pill-options compact">
                {drapeOptions.map(option => (
                  <button key={option} type="button" className={drape === option ? 'on' : ''} onClick={() => setDrape(option)}>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="tryon-panel tryon-upload-panel">
              <div className="tryon-panel-title">4. Customer photo</div>
              <label className="tryon-upload">
                <input type="file" accept="image/*" onChange={event => handlePhotoUpload(event.target.files?.[0])} />
                {photoPreview ? <img src={photoPreview} alt="Customer try-on preview" /> : <span>Upload photo for Claude Vision styling</span>}
              </label>
              <p>Required for real AI styling. The API sends this photo with the selected saree image to Claude Vision.</p>
            </div>

            <button className="tryon-generate" onClick={handleGenerate} disabled={loading} type="button">
              <Sparkles size={18} />
              {loading ? 'Generating styling notes...' : 'Run AI vision recommendation'}
            </button>
          </section>

          <section className={`tryon-result ${generated ? 'ready' : ''}`} aria-live="polite">
            {!generated ? (
              <div className="tryon-placeholder">
                <Sparkles size={54} />
                <h2>Awaiting configuration</h2>
                <p>Choose your skin tone, body frame, and draping style to generate a textile styling suggestion.</p>
              </div>
            ) : (
              <>
                <div className="tryon-score">
                  <span>AI match confidence</span>
                  <strong>{Number(aiResult?.confidence_score || 0)}%</strong>
                  <em>{String(aiResult?.provider || 'provider')} result</em>
                </div>
                <div className="tryon-copy-card">
                  <p>
                    {String(aiResult?.ai_verdict || 'No verdict returned by the AI provider.')}
                  </p>
                  <dl>
                    <div>
                      <dt>Draping specification</dt>
                      <dd>{String(aiResult?.draping_tip || 'No draping guidance returned by the AI provider.')}</dd>
                    </div>
                    <div>
                      <dt>Blouse suggestion</dt>
                      <dd>{String(aiResult?.blouse_suggestion || 'No blouse suggestion returned by the AI provider.')}</dd>
                    </div>
                    <div>
                      <dt>Accessory pairing</dt>
                      <dd>{String(aiResult?.jewellery_pairing || 'No accessory pairing returned by the AI provider.')}</dd>
                    </div>
                    <div>
                      <dt>Colour analysis</dt>
                      <dd>{String(aiResult?.colour_analysis || 'No colour analysis returned by the AI provider.')}</dd>
                    </div>
                  </dl>
                </div>
                {suggestedProduct && (
                  <div className="tryon-suggestion">
                    <ProductVisual product={suggestedProduct} className="tryon-suggestion-img" />
                    <div>
                      <span>Suggested live SKU</span>
                      <strong>{suggestedProduct.name}</strong>
                      <small>Rs {Number(suggestedProduct.price).toLocaleString('en-IN')}</small>
                    </div>
                  </div>
                )}
                <div className="tryon-actions">
                  <button type="button" onClick={() => navigate('/womens')}>Browse sarees</button>
                  <button type="button" className="primary" onClick={() => void addSuggested()}>
                    <ShoppingCart size={16} />
                    Add suggested saree
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
