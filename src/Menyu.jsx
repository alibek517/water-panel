import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./menyu.css";
import Modal from "./Modal";
import SuccessModal from "./SuccessModal";
import exit from "/exit.png";

function Menyu() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [view, setView] = useState("menu");
  const [orders, setOrders] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [zakazlar, setZakazlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingOrder, setEditingOrder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newItem, setNewItem] = useState({ productId: "", count: 1 });

  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [orderCounts, setOrderCounts] = useState({});
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [showToast, setShowToast] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("Barchasi");

  const heroRef = useRef(null);
  const [isSticky, setIsSticky] = useState(false);

  const navigate = useNavigate();
  const API_BASE = "https://suddocs.uz";

  /** Yordamchi funksiyalar **/
  const showToastMessage = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const calculateTotalPrice = (items) => {
    return items.reduce((sum, it) => {
      const price = it.product?.price || 0;
      return sum + price * it.count;
    }, 0);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingOrder(null);
    setNewItem({ productId: "", count: 1 });
    setError(null);
  };

  /** Scroll bilan sticky navbar **/
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const heroBottom = heroRef.current.getBoundingClientRect().bottom;
        setIsSticky(heroBottom <= 0);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /** Orders va dishes ma’lumotlarini olish **/
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsRes, ordersRes] = await Promise.all([
          axios.get(`${API_BASE}/product`),
          axios.get(`${API_BASE}/order`),
        ]);
        setDishes(productsRes.data || []);
        const allOrders = ordersRes.data || [];

        // Buyurtma statuslarini tekshirish va avtomatik yangilash (agar kerak bo‘lsa)
        try {
          await checkAllOrdersCompletion(allOrders);
        } catch (err) {
          console.error("Order completion check error:", err);
        }

        // Yangilangan orders
        const updatedOrdersRes = await axios.get(`${API_BASE}/order`);
        const updatedOrders = updatedOrdersRes.data || [];
        setOrders(updatedOrders);

        // Faqat READY statusidagi itemlar bor buyurtmalar
        const readyOrders = updatedOrders.filter((o) =>
          o.status === "READY" &&
          o.orderItems.some((oi) => oi.status === "READY")
        );
        setZakazlar(readyOrders);
      } catch (err) {
        console.error("Ma’lumotni yuklash xatosi:", err);
        showToastMessage("Ma’lumotlar yuklanmadi", "error");
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /** Order statusini yangilash **/
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await axios.put(
        `${API_BASE}/order/${orderId}`,
        { status: newStatus },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // Alternate routelar…
        try {
          const altResponse = await axios.patch(
            `${API_BASE}/orders/${orderId}/status`,
            { status: newStatus },
            { headers: { "Content-Type": "application/json" } }
          );
          return altResponse.data;
        } catch (e2) {
          const orderResponse = await axios.get(`${API_BASE}/order/${orderId}`);
          const orderData = orderResponse.data;
          const updateResponse = await axios.put(
            `${API_BASE}/order/${orderId}`,
            { ...orderData, status: newStatus },
            { headers: { "Content-Type": "application/json" } }
          );
          return updateResponse.data;
        }
      } else {
        throw error;
      }
    }
  };

  /** Bitta order ichidagi item statusini yangilash **/
  const updateOrderItemStatus = async (orderItemId, newStatus) => {
    try {
      let response;
      try {
        response = await axios.patch(
          `${API_BASE}/order/item/${orderItemId}/status`,
          { status: newStatus }
        );
      } catch (e1) {
        if (e1.response?.status === 404) {
          response = await axios.put(
            `${API_BASE}/order/item/${orderItemId}`,
            { status: newStatus }
          );
        } else {
          throw e1;
        }
      }

      // Zakazlar ro‘yxatida yangilash
      setZakazlar((prev) =>
        prev.map((order) => {
          const updatedItems = order.orderItems.map((it) =>
            it.id === orderItemId ? { ...it, status: newStatus } : it
          );
          return order.orderItems.some((it) => it.id === orderItemId)
            ? { ...order, orderItems: updatedItems }
            : order;
        })
      );

      // Orders ro‘yxatida yangilash va kerak bo‘lsa COMPLETED qilib belgilash
      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          const updatedItems = order.orderItems.map((it) =>
            it.id === orderItemId ? { ...it, status: newStatus } : it
          );
          if (order.orderItems.some((it) => it.id === orderItemId)) {
            const hasActive = updatedItems.some((i) =>
              ["PENDING", "COOKING", "READY"].includes(i.status)
            );
            return {
              ...order,
              orderItems: updatedItems,
              status: !hasActive && updatedItems.length > 0 ? "COMPLETED" : order.status,
            };
          }
          return order;
        })
      );

      // Xabar ko'rsatish
      const parentOrder = orders.find((o) =>
        o.orderItems.some((it) => it.id === orderItemId)
      );
      if (parentOrder) {
        const remaining = parentOrder.orderItems.filter((it) =>
          it.id !== orderItemId && it.status === "READY"
        );
        if (remaining.length > 0) {
          showToastMessage(
            `✅ Mahsulot yetkazildi. Stol ${parentOrder.table.number}da ${remaining.length} ta taom qolmoqda.`
          );
        } else {
          showToastMessage(
            `✅ Stol ${parentOrder.table.number} - barcha taomlar yetkazildi! Zakaz yakunlandi.`
          );
        }
      }
    } catch (err) {
      console.error("Order item status yangilash xatosi:", err);
      showToastMessage("Status yangilashda xatolik yuz berdi", "error");
    }
  };

  /** Barcha orderlarni avtomatik COMPLETED ga tekshirish **/
  const checkAllOrdersCompletion = async (ordersList) => {
    const promises = [];
    ordersList.forEach((order) => {
      if (
        order.status !== "COMPLETED" &&
        order.status !== "CANCELLED" &&
        order.orderItems.length > 0
      ) {
        const hasActive = order.orderItems.some((it) =>
          ["PENDING", "COOKING", "READY"].includes(it.status)
        );
        if (!hasActive) {
          promises.push(
            updateOrderStatus(order.id, "COMPLETED").catch((e) =>
              console.error(`Order ${order.id} completed qilishda xato:`, e)
            )
          );
        }
      }
    });
    if (promises.length) {
      await Promise.allSettled(promises);
    }
  };

  /** Taom sonini + / - qilish **/
  const changeCount = (dishId, delta) => {
    setOrderCounts((prev) => {
      const newCount = (prev[dishId] || 0) + delta;
      if (newCount < 0) return prev;
      return { ...prev, [dishId]: newCount };
    });
  };

  /** Buyurtmalarni olish (alohida, agar kerak bo‘lsa) **/
  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_BASE}/order`);
      setOrders(response.data || []);
    } catch (err) {
      console.error("Buyurtmalarni olishda xatolik:", err);
      showToastMessage("Buyurtmalarni olishda xatolik yuz berdi", "error");
    }
  };
  useEffect(() => {
    fetchOrders();
  }, []);

  /** Buyurtmani saqlash (tahrirlaganidan keyin) **/
  const handleSaveOrder = async () => {
    if (!editingOrder) return;
  
    try {
      // Mahsulotlarni qayta ishlash
      const itemsPayload = editingOrder.orderItems.map((item) => ({
        id: item.id || null, // Agar mavjud bo'lsa, ID saqlanadi, aks holda null
        productId: item.productId ?? item.product?.id,
        count: item.count,
        status: item.status, // Mahsulotning mavjud statusi o'zgarmaydi
      }));
  
      // Yuboriladigan payload
      const payload = {
        products: itemsPayload,
        status: "COOKING", // Buyurtma umumiy statusi COOKING bo'ladi
      };
  
      console.log("Yuborilayotgan payload:", JSON.stringify(payload, null, 2));
  
      // Serverga so'rov yuborish
      const response = await axios.put(
        `${API_BASE}/order/${editingOrder.id}`,
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
  
      console.log("Save response:", response.data);
  
      // Orders ro'yxatini yangilash
      setOrders((prev) =>
        prev.map((o) =>
          o.id === editingOrder.id
            ? {
                ...o,
                status: "COOKING", // Buyurtma umumiy statusi yangilanadi
                orderItems: response.data.orderItems,
              }
            : o
        )
      );
  
      // Tahrirlanayotgan buyurtmani yangilash
      setEditingOrder((prev) =>
        prev && { ...prev, status: "COOKING" }
      );
  
      showToastMessage("Buyurtma saqlandi");
      closeEditModal();
    } catch (err) {
      console.error("Save error:", err);
      setError("Buyurtma saqlashda xato yuz berdi");
    }
  };

  /** Buyurtmani tahrirlash uchun tayyorlash **/
  const handleEditOrder = useCallback((order) => {
    setEditingOrder({ ...order, orderItems: [...order.orderItems] });
    setShowEditModal(true);
    setNewItem({ productId: "", count: 1 });
    setError(null);
  }, []);

  /** Yangi taom qo‘shish **/
  const handleAddItem = async () => {
    if (!editingOrder) return;
    const { productId, count } = newItem;
    if (!productId || count <= 0) {
      alert("Iltimos, taom tanlang va sonini to'g'ri kiriting.");
      return;
    }
    const prod = dishes.find((p) => p.id === Number(productId));
    if (!prod) {
      alert("Taom topilmadi.");
      return;
    }
    const newOrderItem = { productId: Number(prod.id), count: Number(count) };
    const items = [...editingOrder.orderItems, newOrderItem];
    const totalPrice = calculateTotalPrice(items);
    const payload = {
      products: items.map((it) => ({
        productId: Number(it.productId),
        count: Number(it.count),
      })),
      tableId: editingOrder.tableId,
      totalPrice,
      userId: editingOrder.userId,
    };

    try {
      await axios.put(`${API_BASE}/order/${editingOrder.id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      const updatedOrderRes = await axios.get(
        `${API_BASE}/order/${editingOrder.id}`
      );
      const updated = updatedOrderRes.data;
      setEditingOrder(updated);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === updated.id
            ? { ...updated, orderItems: updated.orderItems }
            : o
        )
      );
      setNewItem({ productId: "", count: 1 });
      showToastMessage("Taom qo‘shildi");
    } catch (err) {
      console.error("Qo‘shish xatosi:", err);
      setError("Taomni qo‘shishda xatolik yuz berdi");
    }
  };

  /** Buyurtma ichidan taom o‘chirish **/
  const handleRemoveItem = (itemId) => {
    setEditingOrder((prev) => ({
      ...prev,
      orderItems: prev.orderItems.filter((it) => it.id !== itemId),
    }));
    showToastMessage("Taom o'chirildi!");
  };

  /** Tayyor volgan (READY) buyurtmalarni yetkazish uchun view **/
  const renderShareView = () => {
    const readyItemsByTable = {};
    orders.forEach((order) => {
      const readyItems = order.orderItems.filter(
        (oi) => oi.status === "READY"
      );
      if (!readyItems.length) return;
      const tableNumber = order.table.number;
      if (!readyItemsByTable[tableNumber]) {
        readyItemsByTable[tableNumber] = {
          tableNumber,
          orderId: order.id,
          items: [],
          totalPrice: 0,
        };
      }
      readyItems.forEach((oi) => {
        readyItemsByTable[tableNumber].items.push({ ...oi, orderId: order.id });
        readyItemsByTable[tableNumber].totalPrice +=
          (oi.product?.price || 0) * oi.count;
      });
    });
    if (!Object.keys(readyItemsByTable).length) {
      return <p className="no-orders">🚫 READY statusdagi zakazlar yo'q</p>;
    }
    return Object.values(readyItemsByTable).map((tg) => (
      <div
        key={`table-${tg.tableNumber}`}
        className="zakaz-card"
        style={{ marginBottom: "1rem" }}
      >
        <h3 className="zakaz-title">🪑 Stol raqami: {tg.tableNumber}</h3>
        <ul>
          {tg.items.map((orderItem) => (
            <li key={orderItem.id} style={{ marginBottom: "0.5rem" }}>
              <strong>{orderItem.product?.name || "Noma'lum taom"}</strong> -{" "}
              {orderItem.count} dona
              <button
                onClick={() =>
                  updateOrderItemStatus(orderItem.id, "COMPLETED")
                }
                className="complete-btn"
                style={{
                  marginLeft: "10px",
                  padding: "5px 10px",
                  cursor: "pointer",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                ✅ Yetkazildi
              </button>
            </li>
          ))}
        </ul>
        <div className="total-section">
          <p>
            <strong>💵 Umumiy narx: {calculateTotalPrice(tg.items)}</strong>
          </p>
          <p>
            <strong>📦 Status: READY</strong>
          </p>
          <p>
            <strong>📊 Taomlar soni: {tg.items.length}</strong>
          </p>
        </div>
      </div>
    ));
  };

  /** Menu yoki Zakaz yaratish yoki Edit view render qismi **/
  if (loading) return <div className="loading">Yuklanmoqda...</div>;
  if (error) {
    return (
      <div className="error-container">
        <h2>Xatolik yuz berdi</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Qayta yuklash</button>
      </div>
    );
  }

  const totalItems = Object.values(orderCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const uniqueCategories = Array.from(
    new Map(
      dishes
        .filter((p) => p.category !== null)
        .map((p) => [p.category.id, p.category])
    ).values()
  );

  const filteredDishes =
    selectedCategory === "Barchasi"
      ? dishes
      : dishes.filter((d) => d.category?.name === selectedCategory);

  const filteredOrders =
    activeFilter === "All"
      ? orders
      : orders.filter((order) => order.status === activeFilter);

  return (
    <div className="divManyu">
      <div className="content">
        {/* Hero section */}
        <div ref={heroRef} className="hero-section">
          <div className="overlay" />
          <div className="steam steam1" />
          <div className="steam steam2" />
          <div className="steam steam3" />
          <div className="hero-content">
            <h1>O'zbek</h1>
            <h1 className="title-highlight">
              <img
                src="./achiq.png"
                alt="🇺🇿"
                className="icon-hero"
              />
              MILLIY TAOMLARI
            </h1>
            <p className="subtitle">Har bir taomda mehr, mazza va an'anaviylik</p>
            <div>
              <span style={{ color: "black" }}>Ofitsant: </span>
              <span style={{ color: "black" }}>
                {localStorage.getItem("user") || "Noma'lum"}
              </span>
            </div>
          </div>
        </div>

        {/* Filter va view tanlash tugmalari */}
        <div className={`btttnss ${isSticky ? "fixed margin-top" : ""}`}>
          <div className="btnDiv">
            <button
              className={view === "menu" ? "CatButton active" : "CatButton"}
              onClick={() => setView("menu")}
            >
              Taomlar menyusi
            </button>
            <button
              className={view === "order" ? "CatButton active" : "CatButton"}
              onClick={() => setView("order")}
            >
              Zakaz yaratish
            </button>
            <button
              className={view === "share" ? "CatButton active" : "CatButton"}
              onClick={() => setView("share")}
            >
              Zakazni klentga yetkazish
            </button>
            <button
              className={view === "edit" ? "CatButton active" : "CatButton"}
              onClick={() => setView("edit")}
            >
              Zakazni tahrirlash
            </button>
          </div>

          {(view === "menu" || view === "order") && (
            <div className="count-controls">
              <button
                className={`category-btn ${
                  selectedCategory === "Barchasi" ? "active" : ""
                }`}
                onClick={() => setSelectedCategory("Barchasi")}
              >
                Barchasi
              </button>
              {uniqueCategories.map((category) => (
                <button
                  key={category.id}
                  className={`category-btn ${
                    selectedCategory === category.name ? "active" : ""
                  }`}
                  onClick={() => setSelectedCategory(category.name)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* EDIT VIEW */}
        {view === "edit" && (
          <div>
            <h2>Buyurtmalarni tahrirlash</h2>
            {filteredOrders.filter((item) =>
              ["PENDING", "COOKING", "READY", "COMPLETED"].includes(item.status)
            ).length === 0 ? (
              <p className="no-orders">🚫 Buyurtmalar yo'q</p>
            ) : (
              filteredOrders
                .filter((item) =>
                  ["PENDING", "COOKING", "READY", "COMPLETED"].includes(
                    item.status
                  )
                )
                .map((item) => (
                  <div key={item.id} className="zakaz-card" style={{ marginBottom: "1rem" }}>
                    <h3 className="zakaz-title">
                      🪑 Stol raqami: {item.table.number}
                    </h3>
                    <ul>
                      {item.orderItems.map((orderItem, idx) => (
                        <li key={idx}>
                          {orderItem.product?.name || "Noma'lum"} - {orderItem.count} dona
                        </li>
                      ))}
                    </ul>
                    <p>💵 Umumiy narx: {calculateTotalPrice(item.orderItems)} so'm</p>
                    <p>📦 Status: {item.status}</p>
                    <button
                      className="order-card__edit-btn"
                      onClick={() => handleEditOrder(item)} // endi “order” emas “item”
                      title="Tahrirlash"
                    >
                      ✏️ Tahrirlash
                    </button>
                  </div>
                ))
            )}
          </div>
        )}

        {/* SHARE VIEW (READY status bo‘yicha) */}
        {view === "share" && (
          <div>
            <h2>Zakazlarni yetkazish</h2>
            {renderShareView()}
          </div>
        )}

        {/* MENU VIEW */}
        {view === "menu" && (
          <section className="menu-section">
            <h2 className="menu-title">Menyu</h2>
            <div className="menu-grid">
              {filteredDishes.map((d) => (
                <div key={d.id} className="menu-card">
                  <img src={`${API_BASE}${d.image}`} alt={d.name} />
                  <div className="info">
                    <h3>{d.name}</h3>
                    <p>⏱ {d.date} daqiqa | 🏷 {d.category?.name}</p>
                    <p className="price">
                      {d.price
                        .toString()
                        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                      so'm
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ORDER VIEW (zakaz yaratish) */}
        {view === "order" && (
          <section className="menu-section">
            <div className="menu-grid">
              {filteredDishes.map((d) => (
                <div key={d.id} className="menu-card">
                  <img src={`${API_BASE}${d.image}`} alt={d.name} />
                  <div className="info">
                    <h3>{d.name}</h3>
                    <p className="price">
                      {d.price
                        .toString()
                        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                      so'm
                    </p>
                    <div className="count-controls">
                      <button
                        onClick={() => changeCount(d.id, -1)}
                        className="bttnn"
                        disabled={!orderCounts[d.id] || orderCounts[d.id] <= 0}
                      >
                        -
                      </button>
                      <span>{orderCounts[d.id] || 0}</span>
                      <button
                        onClick={() => changeCount(d.id, 1)}
                        className={orderCounts[d.id] > 0 ? "btnn" : "bttnn"}
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
                <button>Savatga solish ({totalItems})</button>
              </div>
            )}
          </section>
        )}

        {/* EDIT MODAL */}
        {showEditModal && editingOrder && (
          <div className="modal-overlay" onClick={closeEditModal}>
            <div className="modal1" onClick={(e) => e.stopPropagation()}>
              <div className="modal__header">
                <h2 className="modal__title">
                  Buyurtma №{editingOrder.id} ni tahrirlash
                </h2>
                <button className="modal__close-btn" onClick={closeEditModal}>
                  ✖️
                </button>
              </div>

              <div className="modal__content">
                {error && <p className="error-message">{error}</p>}
                <div className="modal__items">
                  <h3>Joriy taomlar:</h3>
                  {editingOrder.orderItems.length ? (
                    <div className="modal__items-list">
                      {editingOrder.orderItems.map((item) => (
                        <div className="modal__item" key={item.id}>
                          <img
                            src={`${API_BASE}${
                              item.product?.image || "/placeholder-food.jpg"
                            }`}
                            alt={item.product?.name}
                            className="modal__item-img"
                            onError={(e) => {
                              e.target.src = "/placeholder-food.jpg";
                            }}
                          />
                          <div className="modal__item-info">
                            <span className="modal__item-name">
                              {item.product?.name || "Noma'lum taom"}
                            </span>
                            <span className="modal__item-details">
                              Soni: {item.count} |{" "}
                              {(item.product?.price || 0)
                                .toString()
                                .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                              so'm
                            </span>
                          </div>
                          <button
                            className="modal__item-remove"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            O'chirish
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="modal__empty">Taomlar yo'q.</p>
                  )}
                </div>

                <div className="modal__add-section">
                  <h3 className="modal__add-title">Yangi taom qo'shish:</h3>
                  <div className="modal__add-form">
                    <select
                      className="modal__select"
                      value={newItem.productId}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          productId: e.target.value,
                        })
                      }
                    >
                      <option value="">Taom tanlang</option>
                      {dishes.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} (
                          {product.price
                            .toString()
                            .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                          so'm)
                        </option>
                      ))}
                    </select>
                    <input
                      className="modal__input"
                      type="number"
                      min="1"
                      value={newItem.count}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          count: parseInt(e.target.value) || 1,
                        })
                      }
                      placeholder="Soni"
                    />
                    <button
                      className="modal__add-btn"
                      onClick={handleAddItem}
                      style={{
                        color: "#fff",
                        border: "none",
                        padding: "10px 20px",
                        cursor: "pointer",
                      }}
                    >
                      Qo'shish
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal__footer">
                <div className="modal__total">
                  Jami:{" "}
                  {calculateTotalPrice(editingOrder.orderItems)
                    .toString()
                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                  so'm
                </div>
                <button
                  className="modal__save-btn"
                  onClick={handleSaveOrder}
                  style={{
                    marginTop: "10px",
                    padding: "10px 20px",
                    backgroundColor: "#007bff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Saqlash
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EXIT ICON */}
        <img
          onClick={() => navigate("/logout")}
          className="exit-icon"
          src={exit}
          alt="exit"
        />

        {/* PLACE ORDER MODAL */}
        {showModal && (
          <Modal
            orderCounts={orderCounts}
            dishes={dishes}
            onClose={() => setShowModal(false)}
            onConfirm={() => {
              setShowModal(false);
              setShowSuccessModal(true);
            }}
          />
        )}

        {/* SUCCESS MODAL */}
        {showSuccessModal && (
          <SuccessModal
            onClose={() => setShowSuccessModal(false)}
            onSuccess={(isValid) => {
              if (isValid) {
                setOrderCounts({});
                setShowSuccessModal(false);
                showToastMessage("Buyurtma muvaffaqiyatli yuborildi!");
              } else {
                showToastMessage("Stol raqamini to'g'ri kiriting!", "error");
              }
            }}
            orderCounts={orderCounts}
            dishes={dishes}
          />
        )}

        {/* TOAST */}
        {showToast && (
          <div
            className={`toast ${
              toastType === "error" ? "toast-error" : "toast-success"
            }`}
          >
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default Menyu;
