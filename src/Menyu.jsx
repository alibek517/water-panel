// Menyu.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './menyu.css';
import Modal from './Modal';
import SuccessModal from './SuccessModal';


function Menyu() {
    const [activeFilter, setActiveFilter] = useState("All");
  const [view, setView] = useState("menu");
    const [orders, setOrders] = useState([]);
  
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [newItem, setNewItem] = useState({ productId: "", count: 1 });


  const API_BASE = "http://109.172.37.41:4000";

  const showToastMessage = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const changeStatus = async (id, newStatus) => {
    try {
      await axios.patch(`${API_BASE}/order/${id}`, { status: newStatus });
      setZakazlar(prev => prev.filter(order => order.id !== id));
    } catch (err) {
      console.error("Xatolik:", err);
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
const handleSaveOrder = async () => {
    if (!editingOrder.orderItems.length) {
      alert("Buyurtma bo'sh bo'lmasligi kerak.");
      return;
    }

    try {
      const totalPrice = editingOrder.orderItems.reduce(
        (sum, item) => sum + parseFloat(item.product.price) * item.count,
        0
      );

      const updatedOrder = {
        tableNumber: editingOrder.tableNumber,
        status: editingOrder.status,
        userId: editingOrder.userId,
        totalPrice,
        product: editingOrder.orderItems
          .filter((item) => item.productId && item.count > 0)
          .map((item) => ({
            productId: Number(item.productId || item.product?.id),
            count: Number(item.count),
          }))
          
          ,
      };

      console.log("PUT so'rovi uchun ma'lumotlar:", updatedOrder);

      const response = await axios.patch(
        `http://109.172.37.41:4000/order/${editingOrder.id}`,
        updatedOrder,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("PATCH javobi:", response.data);

      setOrders(
        orders.map((order) =>
          order.id === editingOrder.id
            ? { ...editingOrder, totalPrice }
            : order
        )
      );
      setShowEditModal(false);
      setEditingOrder(null);
    } catch (err) {
      console.error("Buyurtmani yangilashda xatolik:", err.response?.data || err.message);
      alert("Buyurtmani yangilab bo'lmadi. Qayta urinib ko'ring.");
    }
  };
  const handleEditOrder = (order) => {
    const updatedOrderItems = order.orderItems.map(item => ({
      ...item,
      productId: item.productId || item.product?.id,
      count: item.count || 1,
      product: item.product || dishes.find(d => d.id === item.productId) || null
    }));
  
    setEditingOrder({
      ...order,
      orderItems: updatedOrderItems
    });
  
    setShowEditModal(true);
    setNewItem({ productId: "", count: 1 });
  };
  
  const handleAddItem = () => {
    console.log("Yangi taom qo'shish:", newItem);
    if (!newItem.productId || newItem.count <= 0) {
      alert("Iltimos, taom tanlang va sonini 0 dan katta kiriting.");
      return;
    }

    const product = dishes.find(d => d.id === parseInt(newItem.productId));
    if (!product) {
      alert("Tanlangan taom topilmadi.");
      return;
    } 

    const existingItem = editingOrder.orderItems.find(
      item => item.productId === parseInt(newItem.productId)
    );  



    if (existingItem) {

      setEditingOrder(prev => ({
        ...prev,                    
        orderItems: prev.orderItems.map(item =>
          item.productId === parseInt(newItem.productId)
            ? { ...item, count: item.count + newItem.count }
            : item
        )
      }));
    } else {
      setEditingOrder(prev => ({
        ...prev,
        orderItems: [
          ...prev.orderItems,
          {
            id: `temp-${Date.now()}`, // vaqtinchalik ID
            productId: parseInt(newItem.productId),
            count: newItem.count,
            product: product // to'liq mahsulot ma'lumotlari
          }
        ]
      }));
    }
    setNewItem({ productId: "", count: 1 });  
  };
  const handleRemoveItem = (itemId) => {
    setEditingOrder(prev => ({
      ...prev,
      orderItems: prev.orderItems.filter(item => item.id !== itemId)
    }));
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
        const readyOrders = (ordersRes.data || []).filter(item => item.status === "READY");
        setZakazlar(readyOrders);
  
        // 👉 BU YERGA QO‘SHING
        setOrders(ordersRes.data || []);
  
      } catch (error) {
        console.error("Ma'lumotlarni yuklashda xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  

  const uniqueCategories = Array.from(
    new Map(
      dishes
        .filter(p => p.category !== null)
        .map(p => [p.category.id, p.category])
    ).values()
  );
  const filteredOrders =
  activeFilter === "All"
    ? orders
    : orders.filter((order) => order.status === activeFilter);

  const filteredDishes = selectedCategory === 'Barchasi'
    ? dishes
    : dishes.filter(d => d.category?.name === selectedCategory);

  const totalItems = Object.values(orderCounts).reduce((sum, count) => sum + count, 0);

  if (loading) return <p>Yuklanmoqda...</p>;

  return (
    <div className='divManyu'>
      <div className="content">
        <div className='hero-section'>
          <div className='overlay' />
          <div className='steam steam1' />
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
          <button className={view === "edit" ? "CatButton active" : "CatButton"} onClick={() => setView("edit")}>Zakazni tahrirlash</button>
        </div>

        {(view === "menu" || view === "order") && (
          <div className="category-container">
            <button className={`category-btn ${selectedCategory === 'Barchasi' ? 'active' : ''}`} onClick={() => setSelectedCategory('Barchasi')}>
              Barchasi
            </button>
            {uniqueCategories.map(category => (
              <button key={category.id} className={`category-btn ${selectedCategory === category.name ? 'active' : ''}`} onClick={() => setSelectedCategory(category.name)}>
                {category.name}
              </button>
            ))}
          </div>
        )}

{view === "edit" && (
  <div>
    <h2>Buyurtmalarni tahrirlash</h2>
    {filteredOrders.filter(item => 
      ['PENDING', 'COOKING', 'READY', 'COMPLETED'].includes(item.status)
    ).length === 0 ? (
      <p className="no-orders">🚫 Buyurtmalar yo‘q</p>
    ) : (
      filteredOrders
        .filter(item => ['PENDING', 'COOKING', 'READY', 'COMPLETED'].includes(item.status))
        .map(item => (
          <div key={item.id} className="zakaz-card">
            <h3 className="zakaz-title">🪑 Stol raqami: {item.tableNumber}</h3>
            <ul>
              {item.orderItems.map((orderItem, idx) => (
                <li key={idx}>
                  {orderItem.product?.name || "Noma’lum"} - {orderItem.count} dona
                </li>
              ))}
            </ul>
            <p>💵 Umumiy narx: {formatPrice(item.totalPrice)}</p>
            <p>📦 Status: {item.status}</p>
            <button onClick={() => handleEditOrder(item)}>✏️ Tahrirlash</button>
          </div>
        ))
    )}
  </div>
)}




        {view === "share" && (
          <div>
            <h2>Tayyor Buyurtmalar</h2>
            {zakazlar.length === 0 ? (
              <p className="no-orders">🚫 Tayyor Buyurtmalar yo‘q</p>
            ) : (
              zakazlar.map(item => (
                <div key={item.id} className="zakaz-card">
                  <h3 className="zakaz-title">Stol: {item.tableNumber}</h3>
                  <ul className="zakaz-list">
                    {item.orderItems.map((p, i) => (
                      <li key={i} className="zakaz-item">{p.product.name} — {p.count} dona</li>
                    ))}
                  </ul>
                  <button className="done-btn" onClick={() => changeStatus(item.id, 'COMPLETED')}>
                    ✅ Zakaz klientga yetkazildi
                  </button>
                </div>
              ))
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
                    <p>⏱ {d.date} daqiqa | 🏷 {d.category?.name}</p>
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
                      <button onClick={() => changeCount(d.id, 1)} className={orderCounts[d.id] > 0 ? 'btnn' : 'bttnn'}>
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
      {showEditModal && (
        <div className="modal-overlay">
          <div style={{paddingBottom: '20px'}} className="modal">
            <h2>Buyurtma #{editingOrder?.id} ni tahrirlash</h2>
            <div style={{
              border: "1px solid rgb(82, 82, 82)",
              padding: "10px",
              borderRadius: "5px",
            }}>
              <h3 style={{marginTop: '0px'}}>Joriy taomlar:</h3>
              {editingOrder?.orderItems.length ? (
                editingOrder.orderItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <img
                      src={`http://109.172.37.41:4000${item.product?.image}`}
                      alt={item.product?.name}
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "5px",
                        marginRight: "10px",
                      }}
                    />
                    <span>
                      {item.product?.name} (Soni: {item.count})
                    </span>
                    <button
                      style={{
                        color: "red",
                        border: "1px solid red",
                        padding: "5px",
                        cursor: "pointer",
                        marginLeft: "10px",
                      }}
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      O'chirish
                    </button>
                  </div>
                ))
              ) : (
                <p>Taomlar yo'q.</p>
              )}
            </div>

            <h3 style={{marginBottom: '0px'}}>Yangi taom qo'shish:</h3>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <select
                value={newItem.productId}
                onChange={(e) =>
                  setNewItem({ ...newItem, productId: e.target.value })
                }
                style={{ padding: "5px", width: "200px" }}
              >
                <option value="">Taom tanlang</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({formatPrice(product.price)})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={newItem.count}
                onChange={(e) =>
                  setNewItem({ ...newItem, count: parseInt(e.target.value) || 1 })
                }
                style={{ padding: "5px", width: "80px" }}
                placeholder="Soni"
              />
              <button
                onClick={handleAddItem}
                style={{
                  padding: "5px 10px",
                  background: "#4CAF50",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Qo'shish
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={handleSaveOrder}
                style={{
                  padding: "10px 20px",
                  background: "#4CAF50",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Saqlash
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingOrder(null);
                }}
                style={{
                  padding: "10px 20px",
                  background: "#ccc",
                  color: "black",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}


      {showModal && (
        <Modal
          orderCounts={orderCounts}
          dishes={dishes}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      )}
{showEditModal && (
  <EditOrderModal
    order={editingOrder}
    dishes={dishes}
    onSave={handleSaveOrder}
    onClose={() => setShowEditModal(false)}
    onAddItem={handleAddItem}
    onRemoveItem={handleRemoveItem}
    newItem={newItem}
    setNewItem={setNewItem}
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