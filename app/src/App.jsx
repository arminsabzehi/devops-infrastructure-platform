import { useEffect, useMemo, useState } from 'react'

const products = [
  { id: 1, title: 'گوشی موبایل سامسونگ Galaxy A56 5G', cat: 'موبایل', price: 24990000, old: 27990000, off: '۱۱٪', rating: 4.7, reviews: 1832, img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=85' },
  { id: 2, title: 'لپ تاپ 15.6 اینچی Lenovo IdeaPad Slim 3', cat: 'لپ‌تاپ', price: 42990000, old: 45990000, off: '۶٪', rating: 4.6, reviews: 642, img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=85' },
  { id: 3, title: 'هدفون بی‌سیم Sony WH-1000XM5', cat: 'هدفون و هندزفری', price: 18490000, old: 20990000, off: '۱۲٪', rating: 4.9, reviews: 927, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85' },
  { id: 4, title: 'ساعت هوشمند Apple Watch Series 10', cat: 'ساعت هوشمند', price: 32990000, old: 35990000, off: '۸٪', rating: 4.8, reviews: 411, img: 'https://images.unsplash.com/photo-1551816230-ef5deaed4a26?auto=format&fit=crop&w=700&q=85' },
  { id: 5, title: 'تلویزیون هوشمند 55 اینچ LG OLED', cat: 'تلویزیون', price: 58990000, old: 63990000, off: '۸٪', rating: 4.8, reviews: 218, img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=700&q=85' },
  { id: 6, title: 'کنسول بازی PlayStation 5 Slim', cat: 'کنسول بازی', price: 38990000, old: 41990000, off: '۷٪', rating: 4.9, reviews: 1504, img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=700&q=85' },
  { id: 7, title: 'اسپیکر بلوتوثی JBL Charge 5', cat: 'صوتی', price: 7290000, old: 8190000, off: '۱۱٪', rating: 4.7, reviews: 534, img: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=85' },
  { id: 8, title: 'کفش ورزشی Nike Air Max', cat: 'پوشاک', price: 8990000, old: 9990000, off: '۱۰٪', rating: 4.6, reviews: 287, img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85' },
]
const cats = [['📱','موبایل','گوشی و لوازم جانبی'],['💻','لپ‌تاپ','کامپیوتر و تجهیزات'],['🎧','هدفون و هندزفری','صوتی'],['⌚','ساعت هوشمند','گجت'],['📺','تلویزیون','صوتی تصویری'],['🎮','کنسول بازی','بازی و سرگرمی'],['🏠','لوازم خانه','خانه و آشپزخانه'],['👕','پوشاک','مد و پوشاک']]
const money = n => new Intl.NumberFormat('fa-IR').format(n) + ' تومان'

function App() {
  const [cart, setCart] = useState([])
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('همه')
  const [menu, setMenu] = useState(false)
  const [api, setApi] = useState('در حال بررسی')
  useEffect(() => { fetch('/api/health').then(r => r.ok ? setApi('فعال') : setApi('خطا')).catch(() => setApi('آفلاین')) }, [])
  const filtered = useMemo(() => products.filter(p => (cat === 'همه' || p.cat === cat) && p.title.includes(query)), [cat, query])
  const add = p => setCart(c => [...c, p])
  return <div className="dk" dir="rtl">
    <div className="notice">فقط امروز! ارسال رایگان سفارش‌های بالای ۵ میلیون تومان <b>مشاهده پیشنهادها ←</b></div>
    <header className="dk-header">
      <div className="header-main shell">
        <button className="hamb" onClick={() => setMenu(!menu)}>☰</button>
        <a className="dk-logo" href="/">دیجی‌نو</a>
        <div className="search-box"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="جستجو در هزاران کالا..."/><kbd>⌘ K</kbd></div>
        <div className="user-links"><a href="/account/">♙ ورود | ثبت‌نام</a><i></i><a href="/orders/">پیگیری سفارش</a><button onClick={() => alert(`سبد شما ${cart.length} کالا دارد`)}>🛒 <b>{cart.length}</b></button></div>
      </div>
      <nav className={'mega shell ' + (menu ? 'show' : '')}><button className="categories">☰ <strong>دسته‌بندی کالاها</strong></button><a href="/">خانه</a><a href="/shop/">فروشگاه</a><a href="/#deals">شگفت‌انگیزها</a><a href="/shop/">پرفروش‌ترین‌ها</a><a href="/about/">درباره دیجی‌نو</a><span></span><small>📍 ارسال به ایران</small></nav>
    </header>
    <main>
      <section className="hero shell"><div className="hero-banner"><div><small>پیشنهاد ویژه امروز</small><h1>تا ۴۰٪ تخفیف<br/><strong>محصولات منتخب</strong></h1><p>خرید مطمئن، قیمت رقابتی و ارسال سریع</p><a href="/shop/">مشاهده محصولات ←</a></div><div className="hero-product">🎧<label>تخفیف ویژه</label><strong>۴۰٪</strong></div></div><div className="hero-side"><div>📱<strong>گوشی‌های جدید</strong><small>از ۱۲ میلیون تومان</small></div><div>💻<strong>لپ‌تاپ‌های اقتصادی</strong><small>تا ۲۰٪ تخفیف</small></div></div></section>
      <section className="quick shell"><div>🚚<strong>ارسال سریع</strong><small>به سراسر کشور</small></div><div>✓<strong>ضمانت اصالت</strong><small>تمام کالاها</small></div><div>↩<strong>۷ روز ضمانت بازگشت</strong><small>خرید بدون نگرانی</small></div><div>◉<strong>پرداخت امن</strong><small>درگاه معتبر</small></div><div>☎<strong>پشتیبانی ۲۴ ساعته</strong><small>همیشه کنار شما</small></div></section>
      <section className="shell block"><div className="title"><div><small>دسته‌بندی‌ها</small><h2>دنبال چه چیزی هستی؟</h2></div><a href="/shop/">مشاهده همه ←</a></div><div className="cat-grid">{cats.map(([icon,name,desc]) => <a key={name} href="/shop/" className="cat-card"><span>{icon}</span><strong>{name}</strong><small>{desc}</small></a>)}</div></section>
      <section className="deals" id="deals"><div className="shell"><div className="deals-head"><div><small>تا پایان امروز</small><h2>⚡ شگفت‌انگیزهای دیجی‌نو</h2></div><div className="timer">۰۱ : ۲۷ : ۴۸</div><a href="/shop/">مشاهده همه ←</a></div><div className="deal-grid">{products.slice(0,5).map(p => <article className="deal" key={p.id}><div className="deal-img"><img src={p.img} alt=""/><span>{p.off} تخفیف</span><button onClick={() => add(p)}>+</button></div><small>{p.cat}</small><h3>{p.title}</h3><div className="stars">★ {p.rating} <em>({p.reviews.toLocaleString('fa-IR')})</em></div><strong>{money(p.price)}</strong><del>{money(p.old)}</del></article>)}</div></div></section>
      <section className="shell block"><div className="title"><div><small>محبوب‌ترین‌ها</small><h2>پرفروش‌ترین کالاها</h2></div><a href="/shop/">همه محصولات ←</a></div><div className="filter"><button className={cat==='همه'?'on':''} onClick={()=>setCat('همه')}>همه</button>{cats.slice(0,5).map(([,n])=><button className={cat===n?'on':''} onClick={()=>setCat(n)} key={n}>{n}</button>)}</div><div className="product-grid">{filtered.slice(0,8).map(p => <article className="product"><div className="pimg"><img src={p.img} alt=""/><span>{p.off}</span><button onClick={()=>add(p)}>🛒</button></div><small>{p.cat}</small><h3>{p.title}</h3><div className="stars">★ {p.rating} <em>({p.reviews.toLocaleString('fa-IR')})</em></div><div className="pprice"><strong>{money(p.price)}</strong><del>{money(p.old)}</del></div></article>)}</div></section>
      <section className="brands shell"><div className="title"><div><small>برندهای محبوب</small><h2>بهترین برندها در یک نگاه</h2></div></div><div>{['Samsung','Apple','Xiaomi','Sony','LG','Lenovo','JBL','Nike'].map(x=><span>{x}</span>)}</div></section>
    </main>
    <footer><div className="shell footer-top"><div><a className="dk-logo" href="/">دیجی‌نو</a><p>فروشگاه اینترنتی نسل جدید؛ انتخاب آسان، خرید مطمئن.</p></div><div><strong>خدمات مشتریان</strong><a href="/about/">پاسخ به پرسش‌ها</a><a href="/orders/">پیگیری سفارش</a><a href="/about/">تماس با ما</a></div><div><strong>راهنمای خرید</strong><a href="/shop/">نحوه ثبت سفارش</a><a href="/shop/">شیوه‌های پرداخت</a><a href="/shop/">شرایط بازگشت</a></div><div><strong>زیرساخت سرویس</strong><span>● API: {api}</span><span>● Database: PostgreSQL</span><span>● Architecture: Microservices</span></div></div><div className="copyright">© ۱۴۰۵ دیجی‌نو — تمام حقوق محفوظ است.</div></footer>
  </div>
}
export default App
