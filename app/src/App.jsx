import { useEffect, useMemo, useState } from 'react'

const fallbackProducts = [
  { id: 1, title: 'هدفون بی‌سیم Nova X', category: 'دیجیتال', price: 3890000, oldPrice: 4590000, badge: 'پرفروش', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85' },
  { id: 2, title: 'ساعت هوشمند Aero Pro', category: 'دیجیتال', price: 5290000, oldPrice: 6190000, badge: 'جدید', image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=85' },
  { id: 3, title: 'کتانی Urban Runner', category: 'پوشاک', price: 2790000, oldPrice: 3290000, badge: '٪۱۵ تخفیف', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85' },
  { id: 4, title: 'کوله‌پشتی City Pack', category: 'اکسسوری', price: 1690000, oldPrice: 1990000, badge: 'پیشنهاد ویژه', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85' },
  { id: 5, title: 'عینک آفتابی Milano', category: 'اکسسوری', price: 2190000, oldPrice: 2590000, badge: 'محبوب', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85' },
  { id: 6, title: 'اسپیکر قابل حمل Pulse', category: 'دیجیتال', price: 2490000, oldPrice: 2990000, badge: '٪۱۰ تخفیف', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85' },
]

const categories = [
  ['📱', 'دیجیتال', 'گجت و لوازم دیجیتال'], ['👟', 'پوشاک', 'استایل روزمره'],
  ['🎧', 'صوتی', 'هدفون و اسپیکر'], ['🎒', 'اکسسوری', 'تکمیل استایل'],
]
const formatPrice = (value) => new Intl.NumberFormat('fa-IR').format(value) + ' تومان'

function App() {
  const [products, setProducts] = useState(fallbackProducts)
  const [category, setCategory] = useState('همه')
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [menu, setMenu] = useState(false)
  const [apiStatus, setApiStatus] = useState('در حال بررسی')

  useEffect(() => {
    fetch('/api/projects').then((r) => r.ok ? r.json() : Promise.reject()).then((data) => {
      if (Array.isArray(data) && data.length) setProducts(data.map((item, i) => ({ ...fallbackProducts[i % fallbackProducts.length], ...item, title: item.title })))
    }).catch(() => {})
    fetch('/api/health').then((r) => r.ok ? r.json() : Promise.reject()).then(() => setApiStatus('آنلاین')).catch(() => setApiStatus('آفلاین'))
  }, [])

  const filtered = useMemo(() => products.filter((p) => (category === 'همه' || p.category === category) && p.title.toLowerCase().includes(search.toLowerCase())), [products, category, search])
  const addToCart = (product) => setCart((items) => [...items, product])

  return <div className="store" dir="rtl">
    <div className="top-strip">ارسال رایگان برای سفارش‌های بالای ۳ میلیون تومان <span>•</span> ضمانت اصالت کالا <span>•</span> پشتیبانی ۲۴ ساعته</div>
    <header className="header shell">
      <button className="mobile-menu" onClick={() => setMenu(!menu)}>☰</button>
      <a className="logo" href="#home"><span>نو</span>مارکت</a>
      <div className="search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="دنبال چه چیزی می‌گردی؟" /></div>
      <nav className={menu ? 'nav open' : 'nav'}><a href="#home">خانه</a><a href="#products">فروشگاه</a><a href="#categories">دسته‌بندی‌ها</a><a href="#offers">تخفیف‌ها</a></nav>
      <div className="header-actions"><button className="account">♙ <span>ورود / ثبت‌نام</span></button><button className="cart" onClick={() => alert(`سبد خرید شما ${cart.length} کالا دارد`)}>🛒<b>{cart.length}</b></button></div>
    </header>

    <main>
      <section className="hero-store shell" id="home">
        <div className="hero-content"><div className="hero-kicker">تجربه‌ای تازه برای خرید آنلاین</div><h1>انتخاب کن،<br /><strong>متفاوت زندگی کن.</strong></h1><p>جدیدترین محصولات دیجیتال، پوشاک و اکسسوری را با قیمت مناسب و ارسال سریع پیدا کن.</p><div className="hero-buttons"><a href="#products" className="primary-btn">مشاهده محصولات <span>←</span></a><a href="#offers" className="text-btn">پیشنهادهای امروز</a></div><div className="trust"><span>✓</span> ضمانت ۷ روزه بازگشت کالا <span>✓</span> پرداخت امن</div></div>
        <div className="hero-image"><img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=90" alt="فروشگاه نو مارکت" /><div className="hero-card"><small>پیشنهاد امروز</small><strong>تا ۳۰٪ تخفیف</strong><span>روی محصولات منتخب</span></div></div>
      </section>

      <section className="category-section shell" id="categories"><div className="section-title"><div><small>دسته‌بندی محبوب</small><h2>برای هر سلیقه‌ای</h2></div><a href="#products">همه دسته‌ها ←</a></div><div className="category-grid">{categories.map(([icon, name, desc]) => <button className="category-card" key={name} onClick={() => { setCategory(name); document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth' }) }}><span>{icon}</span><strong>{name}</strong><small>{desc}</small></button>)}</div></section>

      <section className="products-section shell" id="products"><div className="section-title"><div><small>منتخب نو مارکت</small><h2>محبوب‌ترین‌ها</h2></div><div className="filters">{['همه', 'دیجیتال', 'پوشاک', 'اکسسوری', 'صوتی'].map((item) => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div></div><div className="product-grid">{filtered.map((product) => <article className="product" key={product.id}><div className="product-image"><img src={product.image} alt={product.title} /><span>{product.badge}</span><button onClick={() => addToCart(product)}>+</button></div><div className="product-info"><small>{product.category}</small><h3>{product.title}</h3><div className="rating">★★★★★ <em>۴.۸</em></div><div className="price"><strong>{formatPrice(product.price)}</strong><del>{formatPrice(product.oldPrice)}</del></div></div></article>)}</div></section>

      <section className="offer shell" id="offers"><div><small>تا پایان امروز</small><h2>جمعه‌ی هیجان‌انگیز</h2><p>تخفیف‌های ویژه روی صدها محصول منتخب؛ فرصت رو از دست نده.</p><a href="#products" className="primary-btn">خرید با تخفیف ←</a></div><div className="offer-number"><strong>۳۰٪</strong><span>تخفیف ویژه</span></div></section>
      <section className="features shell"><div>🚚<strong>ارسال سریع</strong><span>تحویل در کوتاه‌ترین زمان</span></div><div>🛡️<strong>ضمانت اصالت</strong><span>خرید مطمئن و بدون نگرانی</span></div><div>↩️<strong>هفت روز بازگشت</strong><span>خرید با خیال راحت</span></div><div>☎️<strong>پشتیبانی ۲۴/۷</strong><span>همیشه کنار شما هستیم</span></div></section>
    </main>

    <footer className="footer-store"><div className="shell footer-inner"><div><a className="logo" href="#home"><span>نو</span>مارکت</a><p>فروشگاهی برای انتخاب‌های بهتر، سریع‌تر و مطمئن‌تر.</p></div><div><strong>راهنمای خرید</strong><a href="#products">روش ثبت سفارش</a><a href="#products">شیوه‌های پرداخت</a><a href="#offers">شرایط بازگشت</a></div><div><strong>خدمات مشتریان</strong><a href="#home">تماس با ما</a><a href="#home">پرسش‌های متداول</a><a href="#home">پیگیری سفارش</a></div><div><strong>وضعیت سرویس</strong><span className="api"><i /> {apiStatus}</span><small>Frontend · Backend · Database</small></div></div><div className="copyright">© ۱۴۰۵ نو مارکت — ساخته شده با معماری چندلایه و آماده‌ی Kubernetes</div></footer>
  </div>
}

export default App
