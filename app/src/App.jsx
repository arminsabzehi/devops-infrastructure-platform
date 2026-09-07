import { useEffect, useMemo, useState } from 'react'

const catMeta = {
  mobile: ['📱','گوشی و لوازم جانبی'], laptop: ['💻','کامپیوتر و تجهیزات'], headphones: ['🎧','صوتی و هدفون'], 'smart-watch': ['⌚','گجت و پوشیدنی'], tv: ['📺','صوتی تصویری'], 'gaming-console': ['🎮','بازی و سرگرمی'], home: ['🏠','خانه و آشپزخانه'], fashion: ['👕','مد و پوشاک']
}
const money = n => new Intl.NumberFormat('fa-IR').format(Number(n || 0)) + ' تومان'

function App() {
  const [cart, setCart] = useState([])
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('همه')
  const [menu, setMenu] = useState(false)
  const [api, setApi] = useState('در حال بررسی')
  const [products, setProducts] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetch('/api/health').then(r => r.ok ? setApi('فعال') : setApi('خطا')).catch(() => setApi('آفلاین')) }, [])
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true); setError('')
        const [pr, cr] = await Promise.all([fetch('/api/products?limit=100&sort=popular'), fetch('/api/categories')])
        if (!pr.ok || !cr.ok) throw new Error('خطا در دریافت اطلاعات فروشگاه')
        const [pd, cd] = await Promise.all([pr.json(), cr.json()])
        if (cancelled) return
        setProducts(pd.items || [])
        setCats(cd || [])
      } catch (e) { if (!cancelled) setError(e.message) }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => products.filter(p => (cat === 'همه' || p.category === cat) && (!query || p.name.includes(query) || (p.description || '').includes(query))), [products, cat, query])
  const add = p => setCart(c => [...c, p])
  const catInfo = c => catMeta[c.slug] || ['🛍️','محصولات منتخب']

  return <div className="dk" dir="rtl">
    <div className="notice">فقط امروز! ارسال رایگان سفارش‌های بالای ۵ میلیون تومان <b>مشاهده پیشنهادها ←</b></div>
    <header className="dk-header">
      <div className="header-main shell">
        <button className="hamb" onClick={() => setMenu(!menu)}>☰</button><a className="dk-logo" href="/">دیجی‌نو</a>
        <div className="search-box"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="جستجو در هزاران کالا..."/><kbd>⌘ K</kbd></div>
        <div className="user-links"><a href="/account/">♙ ورود | ثبت‌نام</a><i></i><a href="/orders/">پیگیری سفارش</a><button onClick={() => alert(`سبد شما ${cart.length} کالا دارد`)}>🛒 <b>{cart.length}</b></button></div>
      </div>
      <nav className={'mega shell ' + (menu ? 'show' : '')}><button className="categories">☰ <strong>دسته‌بندی کالاها</strong></button><a href="/">خانه</a><a href="/shop/">فروشگاه</a><a href="/#deals">شگفت‌انگیزها</a><a href="/shop/">پرفروش‌ترین‌ها</a><a href="/about/">درباره دیجی‌نو</a><span></span><small>📍 ارسال به ایران</small></nav>
    </header>
    <main>
      <section className="hero shell"><div className="hero-banner"><div><small>پیشنهاد ویژه امروز</small><h1>تا ۴۰٪ تخفیف<br/><strong>محصولات منتخب</strong></h1><p>خرید مطمئن، قیمت رقابتی و ارسال سریع</p><a href="/shop/">مشاهده محصولات ←</a></div><div className="hero-product">🎧<label>تخفیف ویژه</label><strong>۴۰٪</strong></div></div><div className="hero-side"><div>📱<strong>گوشی‌های جدید</strong><small>از ۱۲ میلیون تومان</small></div><div>💻<strong>لپ‌تاپ‌های اقتصادی</strong><small>تا ۲۰٪ تخفیف</small></div></div></section>
      <section className="quick shell"><div>🚚<strong>ارسال سریع</strong><small>به سراسر کشور</small></div><div>✓<strong>ضمانت اصالت</strong><small>تمام کالاها</small></div><div>↩<strong>۷ روز ضمانت بازگشت</strong><small>خرید بدون نگرانی</small></div><div>◉<strong>پرداخت امن</strong><small>درگاه معتبر</small></div><div>☎<strong>پشتیبانی ۲۴ ساعته</strong><small>همیشه کنار شما</small></div></section>
      <section className="shell block"><div className="title"><div><small>دسته‌بندی‌ها</small><h2>دنبال چه چیزی هستی؟</h2></div><a href="/shop/">مشاهده همه ←</a></div><div className="cat-grid">{cats.map(c => { const [icon,desc]=catInfo(c); return <button key={c.id} onClick={()=>{setCat(c.name);document.getElementById('products')?.scrollIntoView({behavior:'smooth'})}} className="cat-card"><span>{icon}</span><strong>{c.name}</strong><small>{desc}</small></button> })}</div></section>
      <section className="deals" id="deals"><div className="shell"><div className="deals-head"><div><small>تا پایان امروز</small><h2>⚡ شگفت‌انگیزهای دیجی‌نو</h2></div><div className="timer">۰۱ : ۲۷ : ۴۸</div><a href="/shop/">مشاهده همه ←</a></div><div className="deal-grid">{products.slice(0,5).map(p => <article className="deal" key={p.id}><div className="deal-img"><img src={p.image} alt={p.name}/><span>{p.badge || 'پیشنهاد ویژه'}</span><button onClick={()=>add(p)}>+</button></div><small>{p.category}</small><h3>{p.name}</h3><div className="stars">★ {p.rating} <em>({Number(p.review_count || 0).toLocaleString('fa-IR')})</em></div><strong>{money(p.price)}</strong><del>{p.old_price ? money(p.old_price) : ''}</del></article>)}</div></div></section>
      <section className="shell block" id="products"><div className="title"><div><small>محبوب‌ترین‌ها</small><h2>پرفروش‌ترین کالاها</h2></div><a href="/shop/">همه محصولات ←</a></div><div className="filter"><button className={cat==='همه'?'on':''} onClick={()=>setCat('همه')}>همه</button>{cats.slice(0,7).map(c=><button className={cat===c.name?'on':''} onClick={()=>setCat(c.name)} key={c.id}>{c.name}</button>)}</div>{error && <div className="error">{error}</div>}{loading ? <div className="loading">در حال دریافت محصولات...</div> : <div className="product-grid">{filtered.map(p => <article className="product" key={p.id}><div className="pimg"><img src={p.image} alt={p.name}/><span>{p.badge || ''}</span><button onClick={()=>add(p)}>🛒</button></div><small>{p.category}</small><h3>{p.name}</h3><div className="stars">★ {p.rating} <em>({Number(p.review_count || 0).toLocaleString('fa-IR')})</em></div><div className="pprice"><strong>{money(p.price)}</strong><del>{p.old_price ? money(p.old_price) : ''}</del></div></article>)}</div>}</section>
      <section className="brands shell"><div className="title"><div><small>برندهای محبوب</small><h2>بهترین برندها در یک نگاه</h2></div></div><div>{['Samsung','Apple','Xiaomi','Sony','LG','Lenovo','JBL','Nike'].map(x=><span key={x}>{x}</span>)}</div></section>
    </main>
    <footer><div className="shell footer-top"><div><a className="dk-logo" href="/">دیجی‌نو</a><p>فروشگاه اینترنتی نسل جدید؛ انتخاب آسان، خرید مطمئن.</p></div><div><strong>خدمات مشتریان</strong><a href="/about/">پاسخ به پرسش‌ها</a><a href="/orders/">پیگیری سفارش</a><a href="/about/">تماس با ما</a></div><div><strong>راهنمای خرید</strong><a href="/shop/">نحوه ثبت سفارش</a><a href="/shop/">شیوه‌های پرداخت</a><a href="/shop/">شرایط بازگشت</a></div><div><strong>زیرساخت سرویس</strong><span>● API: {api}</span><span>● Database: PostgreSQL</span><span>● Architecture: Microservices</span></div></div><div className="copyright">© ۱۴۰۵ دیجی‌نو — تمام حقوق محفوظ است.</div></footer>
  </div>
}
export default App
