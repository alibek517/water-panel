import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './menyu.css';
import Modal from './Modal';
import SuccessModal from './SuccessModal';

function Menyu() {
  const [view, setView] = useState("menu");
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');
  const [orderCounts, setOrderCounts] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showToast, setShowToast] = useState(false);
  const [zakazlar, setZakazlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dishes, setDishes] = useState([]);
  const [hiddenZakazlar, setHiddenZakazlar] = useState([]);

  const API_BASE = "http://109.172.37.41:4000";

  const showToastMessage = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleZakazDelete = async (id) => {
    try {
      const response = await axios.delete(`${API_BASE}/order/${id}`);
      if (response.status === 200) {
        setZakazlar(prev => prev.filter(z => z.id !== id));
        setHiddenZakazlar(prev => [...prev, id]);
        showToastMessage("Zakaz muvaffaqiyatli yetkazildi", "success");
      } else {
        showToastMessage("Zakazni yetkazishda xatolik yuz berdi!", "error");
      }
    } catch (error) {
      console.error("O‘chirish xatosi:", error);
      showToastMessage("Server bilan bog‘lanishda xatolik!", "error");
    }
  };

  const changeCount = (dishId, delta) => {
    setOrderCounts(prev => {
      const newCount = (prev[dishId] || 0) + delta;
      if (newCount < 0) return prev;
      return { ...prev, [dishId]: newCount };
    });
  };

  const formatPrice = (price) => {
    if (price == null) return 'N/A';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' so‘m';
  };

  const handleConfirm = () => {
    setShowModal(false);
    setShowSuccessModal(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsRes, ordersRes] = await Promise.all([
          axios.get(`${API_BASE}/product`),
          axios.get(`${API_BASE}/order`)
        ]);

        setDishes(productsRes.data || []);
        const readyOrders = (ordersRes.data || []).filter(item => item.holat === "READY" || item.status === "READY");
        setZakazlar(readyOrders);
      } catch (error) {
        console.error("Ma'lumotlarni yuklashda xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const categories = ['Barchasi', ...new Set(dishes.map(d => d.category))];
  const filteredDishes = selectedCategory === 'Barchasi' ? dishes : dishes.filter(d => d.category === selectedCategory);
  const totalItems = Object.values(orderCounts).reduce((sum, count) => sum + count, 0);
console.log(categories[1].name);

  if (loading) return <p>Yuklanmoqda...</p>;

  return (
    <div className='divManyu'>
      <div className="content">
        <div className='hero-section'>
          <div className='overlay' />
          <div className='steam' />
          <div className='steam steam2' />
          <div className='steam steam3' />
          <div className='hero-content'>
            <h1>O‘zbek</h1>
            <h1 className="title-highlight">
              <img src="./achiq.png" alt="🇺🇿" className="icon-hero" />
              MILLIY TAOMLARI
            </h1>
            <p className='subtitle'>Har bir taomda mehr, mazza va an'anaviylik</p>
          </div>
        </div>

        <div className='btnDiv'>
          <button className={view === "menu" ? "CatButton active" : "CatButton"} onClick={() => setView("menu")}>Taomlar menyusi</button>
          <button className={view === "order" ? "CatButton active" : "CatButton"} onClick={() => setView("order")}>Zakaz yaratish</button>
          <button className={view === "share" ? "CatButton active" : "CatButton"} onClick={() => setView("share")}>Zakazni klentga yetkazish</button>
        </div>

        {categories.map(category => (
  <button
    key={category}
    className={`category-btn ${selectedCategory === (category?.name || '') ? 'active' : ''}`}
    onClick={() => setSelectedCategory(category.name)}
  >
    {category.name}
  </button>
))}



        {view === "share" && (
          <div>
            <h2>Tayyor Buyurtmalar</h2>
            {zakazlar.length === 0 ? (
              <p className="no-orders">Tayyor buyurtmalar yo‘q</p>
            ) : (
              <div>
                {zakazlar
                  .filter(item => !hiddenZakazlar.includes(item.id))
                  .map(item => (
                  <div key={item.id} className="zakaz-card">
                    <h3 className="zakaz-title">Stol: {item.tableNumber}</h3>
                    <ul className="zakaz-list">
                      {item.orderItems.map((p, i) => (
                        <li key={i} className="zakaz-item">
                          {p.product.name} — {p.count} dona
                        </li>
                      ))}
                    </ul>
                    <button className="zakaz-btn" onClick={() => handleZakazDelete(item.id)}>
                      Zakaz klientga yetkazildi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "menu" && (
          <section className="menu-section">
            <h2 className="menu-title">Menyu</h2>
            <div className="menu-grid">
              {filteredDishes.map(d => (
                <div key={d.id} className="menu-card">
                  <img src={`${API_BASE}${d.image}`} alt={d.name} />
                  <div className="info">
                    <h3>{d.name}</h3>
                    <p>⏱ {d.time} daqiqa | 🏷 {d.category}</p>
                    <p className="price">{formatPrice(d.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {view === "order" && (
          <section className="menu-section">
            <div className="menu-grid">
              {filteredDishes.map(d => (
                <div key={d.id} className="menu-card">
                  <img src={`${API_BASE}${d.image}`} alt={d.name} />
                  <div className="info">
                    <h3>{d.name}</h3>
                    <p className="price">{formatPrice(d.price)}</p>
                    <div className="count-controls">
                      <button onClick={() => changeCount(d.id, -1)} className="bttnn">-</button>
                      <span>{orderCounts[d.id] || 0}</span>
                      <button
                        onClick={() => changeCount(d.id, 1)}
                        className={orderCounts[d.id] > 0 ? 'btnn' : 'bttnn'}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalItems > 0 && !showSuccessModal && !showModal && (
              <div className="add-to-cart" onClick={() => setShowModal(true)}>
                <button>Savatga solish</button>
              </div>
            )}
          </section>
        )}
      </div>

      {showModal && (
        <Modal
          orderCounts={orderCounts}
          dishes={dishes}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      )}
      {showSuccessModal && (
        <SuccessModal
          onClose={() => setShowSuccessModal(false)}
          onSuccess={(isValid) => {
            if (isValid) {
              setOrderCounts({});
              setShowSuccessModal(false);
              showToastMessage("Buyurtma muvaffaqiyatli yuborildi!");
            } else {
              showToastMessage("Stol raqamini to‘g‘ri kiriting!", "error");
            }
          }}
          orderCounts={orderCounts}
          dishes={dishes}
        />
      )}

      {showToast && (
        <div className={`toast ${toastType === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default Menyu;
