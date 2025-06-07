import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import "./menyu.css";
import Modal from "./Modal";
import SuccessModal from "./SuccessModal";
import exit from "/exit.png";
import {
  Armchair,
  XCircle,
  DollarSign,
  Package,
  BarChart,
  Pencil,
  CheckCircle,
} from "lucide-react";

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
  const socketRef = useRef(null);

  const navigate = useNavigate();
  const API_BASE = "https://suddocs.uz";
  const RESTAURANT_ID = "default";
  const ROLE = "waiter";
  const [currentIndex, setCurrentIndex] = useState(0);

  const buttons = [
    { id: "menu", text: "Taomlar menyusi" },
    { id: "order", text: "Zakaz yaratish" },
    { id: "share", text: "Zakazni klentga yetkazish" },
    { id: "edit", text: "Zakazni tahrirlash" },
  ];

  const handlePrevious = () => {
    const newIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    setCurrentIndex(newIndex);
    setView(buttons[newIndex].id);
  };

  const handleNext = () => {
    const newIndex = (currentIndex + 1) % buttons.length;
    setCurrentIndex(newIndex);
    setView(buttons[newIndex].id);
  };

  const currentButton = buttons[currentIndex];

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

  useEffect(() => {
    socketRef.current = io(API_BASE, {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      secure: true,
      query: { role: ROLE, restaurantId: RESTAURANT_ID },
    });

    socketRef.current.on("connect", () => {
      console.log("WebSocket connected:", socketRef.current.id);
      socketRef.current.emit("fetch_kitchen_orders", { restaurantId: RESTAURANT_ID });
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("WebSocket connection error:", err);
      showToastMessage("WebSocket ulanishida xato yuz berdi", "error");
    });

    socketRef.current.on("orderCreated", (order) => {
      if (!order.orderItems) {
        console.warn("Received order without orderItems:", order);
        order.orderItems = [];
      }
      setOrders((prev) => [...prev, order]);
      if (order.status === "READY" && order.orderItems.some((oi) => oi.status === "READY")) {
        setZakazlar((prev) => [...prev, order]);
      }
      showToastMessage(`Yangi buyurtma qo'shildi: Stol ${order.table?.number || "N/A"}`);
    });

    socketRef.current.on("orderUpdated", (updatedOrder) => {
      if (!updatedOrder.orderItems) {
        console.warn("Received updated order without orderItems:", updatedOrder);
        updatedOrder.orderItems = [];
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
      setZakazlar((prev) =>
        prev
          .map((o) =>
            o.id === updatedOrder.id ? updatedOrder : o
          )
          .filter((o) => o.status === "READY" && o.orderItems.some((oi) => oi.status === "READY"))
      );
      showToastMessage(`Buyurtma yangilandi: Stol ${updatedOrder.table?.number || "N/A"}`);
    });

    socketRef.current.on("orderItemStatusUpdated", (orderItem) => {
      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (!order.orderItems) {
            console.warn(`Order ${order.id} has no orderItems during item status update:`, order);
            return order;
          }
          const updatedItems = order.orderItems.map((it) =>
            it.id === orderItem.id ? { ...it, status: orderItem.status } : it
          );
          if (order.orderItems.some((it) => it.id === orderItem.id)) {
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
      setZakazlar((prev) =>
        prev
          .map((order) => {
            if (!order.orderItems) {
              console.warn(`Order ${order.id} has no orderItems in zakazlar update:`, order);
              return order;
            }
            const updatedItems = order.orderItems.map((it) =>
              it.id === orderItem.id ? { ...it, status: orderItem.status } : it
            );
            return { ...order, orderItems: updatedItems };
          })
          .filter((o) => o.status === "READY" && o.orderItems.some((oi) => oi.status === "READY"))
      );
      const parentOrder = orders.find((o) => o.orderItems?.some((it) => it.id === orderItem.id));
      if (parentOrder) {
        const remaining = parentOrder.orderItems.filter(
          (it) => it.id !== orderItem.id && it.status === "READY"
        );
        if (remaining.length > 0) {
          showToastMessage(
            `Mahsulot yetkazildi. Stol ${parentOrder.table?.number || "N/A"}da ${remaining.length} ta taom qolmoqda.`
          );
        } else {
          showToastMessage(
            `Stol ${parentOrder.table?.number || "N/A"} - barcha taomlar yetkazildi! Zakaz yakunlandi.`
          );
        }
      }
    });

    socketRef.current.on("orderDeleted", ({ id }) => {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      setZakazlar((prev) => prev.filter((o) => o.id !== id));
      showToastMessage(`Buyurtma o'chirildi: ID ${id}`);
    });

    socketRef.current.on("orderItemDeleted", ({ id }) => {
      setOrders((prevOrders) =>
        prevOrders.map((order) => ({
          ...order,
          orderItems: order.orderItems?.filter((it) => it.id !== id) || [],
        }))
      );
      setZakazlar((prev) =>
        prev
          .map((order) => ({
            ...order,
            orderItems: order.orderItems?.filter((it) => it.id !== id) || [],
          })
          .filter((o) => o.status === "READY" && o.orderItems.some((oi) => oi.status === "READY"))
      ));
      showToastMessage(`Taom o'chirildi: ID ${id}`);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log("WebSocket disconnected");
      }
    };
  }, []);

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsRes, ordersRes] = await Promise.all([
          axios.get(`${API_BASE}/product`),
          axios.get(`${API_BASE}/order`),
        ]);
        const products = Array.isArray(productsRes.data) ? productsRes.data : [];
        const allOrders = Array.isArray(ordersRes.data) ? ordersRes.data.map(order => ({
          ...order,
          orderItems: Array.isArray(order.orderItems) ? order.orderItems : []
        })) : [];
        
        console.log("API Products Response:", products);
        console.log("API Orders Response:", allOrders);
        
        setDishes(products);
        await checkAllOrdersCompletion(allOrders);

        const updatedOrdersRes = await axios.get(`${API_BASE}/order`);
        const updatedOrders = Array.isArray(updatedOrdersRes.data) ? updatedOrdersRes.data.map(order => ({
          ...order,
          orderItems: Array.isArray(order.orderItems) ? order.orderItems : []
        })) : [];
        setOrders(updatedOrders);

        const readyOrders = updatedOrders.filter(
          (o) => o.status === "READY" && o.orderItems.some((oi) => oi.status === "READY")
        );
        setZakazlar(readyOrders);
      } catch (err) {
        console.error("Ma'lumotni yuklash xatosi:", err);
        showToastMessage("Ma'lumotlar yuklanmadi", "error");
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await axios.put(
        `${API_BASE}/order/${orderId}`,
        { status: newStatus },
        { headers: { "Content-Type": "application/json" } }
      );
      if (socketRef.current) {
        socketRef.current.emit("update_order_status", { orderId, status: newStatus });
      }
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        try {
          const altResponse = await axios.patch(
            `${API_BASE}/orders/${orderId}/status`,
            { status: newStatus },
            { headers: { "Content-Type": "application/json" } }
          );
          if (socketRef.current) {
            socketRef.current.emit("update_order_status", { orderId, status: newStatus });
          }
          return altResponse.data;
        } catch (e2) {
          const orderResponse = await axios.get(`${API_BASE}/order/${orderId}`);
          const orderData = orderResponse.data;
          const updateResponse = await axios.put(
            `${API_BASE}/order/${orderId}`,
            { ...orderData, status: newStatus },
            { headers: { "Content-Type": "application/json" } }
          );
          if (socketRef.current) {
            socketRef.current.emit("update_order_status", { orderId, status: newStatus });
          }
          return updateResponse.data;
        }
      } else {
        throw error;
      }
    }
  };

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
      if (socketRef.current) {
        socketRef.current.emit("update_order_item_status", {
          itemId: orderItemId,
          status: newStatus,
        });
      }
      showToastMessage("Status yangilandi!");
    } catch (err) {
      console.error("Order item status yangilash xatosi:", err);
      showToastMessage("Status yangilashda xatolik yuz berdi", "error");
    }
  };

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

  const changeCount = (dishId, delta) => {
    setOrderCounts((prev) => {
      const newCount = (prev[dishId] || 0) + delta;
      if (newCount < 0) return prev;
      return { ...prev, [dishId]: newCount };
    });
  };

  const handleAddItem = () => {
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

    const newOrderItem = {
      productId: Number(prod.id),
      product: prod,
      count: Number(count),
      status: "PENDING",
      isNew: true,
    };

    setEditingOrder((prev) => ({
      ...prev,
      orderItems: [...prev.orderItems, newOrderItem],
    }));

    setNewItem({ productId: "", count: 1 });
    showToastMessage("Yangi taom qo'shildi (PENDING status bilan)");
  };

  const handleSaveOrder = async () => {
    if (!editingOrder) return;

    try {
      const itemsPayload = editingOrder.orderItems.map((item) => ({
        id: item.id || null,
        productId: item.productId ?? item.product?.id,
        count: item.count,
        status: !item.id || item.isNew ? "PENDING" : item.status,
      }));

      let orderStatus = editingOrder.status;
      const hasNewItems = editingOrder.orderItems.some((item) => !item.id || item.isNew);

      if (hasNewItems) {
        if (editingOrder.status === "COMPLETED" || editingOrder.status === "READY") {
          orderStatus = "COOKING";
        }
      }

      const payload = {
        products: itemsPayload,
        status: orderStatus,
      };

      const response = await axios.put(
        `${API_BASE}/order/${editingOrder.id}`,
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      if (socketRef.current) {
        socketRef.current.emit("update_order_status", {
          orderId: editingOrder.id,
          status: orderStatus,
        });
      }

      setEditingOrder((prev) =>
        prev && {
          ...prev,
          status: orderStatus,
          orderItems: (response.data.orderItems || prev.orderItems).map((item) => ({
            ...item,
            isNew: undefined,
          })),
        }
      );

      showToastMessage("Buyurtma saqlandi!");
      closeEditModal();
    } catch (err) {
      console.error("Save error:", err);
      setError("Buyurtma saqlashda xato yuz berdi");
      showToastMessage("Buyurtma saqlashda xato yuz berdi", "error");
    }
  };

  const handleEditOrder = useCallback((order) => {
    setEditingOrder({ ...order, orderItems: Array.isArray(order.orderItems) ? [...order.orderItems] : [] });
    setShowEditModal(true);
    setNewItem({ productId: "", count: 1 });
    setError(null);
  }, []);

  const handleRemoveItem = (itemId) => {
    setEditingOrder((prev) => ({
      ...prev,
      orderItems: prev.orderItems.filter((it) => it.id !== itemId),
    }));
    if (socketRef.current) {
      socketRef.current.emit("orderItemDeleted", { id: itemId });
    }
    showToastMessage("Taom o'chirildi!");
  };

  const renderShareView = () => {
    const readyItemsByTable = {};
    orders.forEach((order) => {
      if (!order.orderItems) {
        console.warn(`Order ${order.id} has no orderItems:`, order);
        return;
      }
      const readyItems = order.orderItems.filter((oi) => oi.status === "READY");
      if (!readyItems.length) return;
      const tableNumber = order.table?.number || "N/A";
      if (!readyItemsByTable[tableNumber]) {
        readyItemsByTable[tableNumber] = {
          tableNumber,
          orderId: order.id,
          items: [],
          totalPrice: 0,
          table: order.table,
        };
      }
      readyItems.forEach((oi) => {
        readyItemsByTable[tableNumber].items.push({ ...oi, orderId: order.id });
        readyItemsByTable[tableNumber].totalPrice += (oi.product?.price || 0) * oi.count;
      });
    });

    if (!Object.keys(readyItemsByTable).length) {
      return (
        <p className="no-orders">
          <XCircle size={20} className="icon" /> Tayor zakazlar yo'q
        </p>
      );
    }

    return Object.values(readyItemsByTable).map((tg) => (
      <div
        key={`table-${tg.tableNumber}`}
        className="zakaz-card"
        style={{ marginBottom: "1rem" }}
      >
        <h3 className="zakaz-title">
          <Armchair size={20} className="icon" /> Stol raqami: {tg.table?.number || "N/A"}
        </h3>
        <ul>
          {tg.items.map((orderItem) => (
            <li key={orderItem.id} style={{ marginBottom: "0.5rem" }}>
              <div style={{display:'flex', alignItems:'center',gap:'5px'}}>
              <strong style={{color:'#000'}}>{orderItem.product?.name || "Noma'lum taom"}</strong> 
              <strong style={{color:'#fff',background:'#000',padding:'15px',borderRadius:'30px'}}>  {orderItem.count} dona</strong>
              </div>
              <button
                onClick={() => updateOrderItemStatus(orderItem.id, "COMPLETED")}
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
                  display:'flex',
                  alignItems:'center',
                  gap:'5px'
                }}
              >
                <CheckCircle size={16} className="icon" /> Yetkazildi
              </button>
            </li>
          ))}
        </ul>
        <div className="total-section">
          <p>
            <strong style={{display:'flex',alignItems:'center',gap:'5px'}}>
              <DollarSign size={20} className="icon" /> Umumiy narx: {calculateTotalPrice(tg.items)}
            </strong>
          </p>
          <p>
            <strong style={{display:'flex',alignItems:'center',gap:'5px'}}>
              <Package size={20} className="icon" /> Status: READY
            </strong>
          </p>
          <p>
            <strong style={{display:'flex',alignItems:'center',gap:'5px'}}>
              <BarChart size={20} className="icon" /> Taomlar soni: {tg.items.length}
            </strong>
          </p>
        </div>
      </div>
    ));
  };

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

  const totalItems = Object.values(orderCounts).reduce((sum, count) => sum + count, 0);

  const uniqueCategories = Array.from(
    new Map(
      (Array.isArray(dishes) ? dishes : [])
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
        <div ref={heroRef} className="hero-section">
          <div className="overlay" />
          <div className="hero-content">
            <h1>O'zbek</h1>
            <h1 className="title-highlight">MILLIY TAOMLARI</h1>
            <p className="subtitle">Har bir taomda mehr, mazza va an'anaviylik</p>
            <div>
              <span style={{ color: "black" }}>Ofitsant: </span>
              <span style={{ color: "black" }}>
                {localStorage.getItem("user") || "Noma'lum"}
              </span>
            </div>
          </div>
        </div>

        <div className={`btttnss ${isSticky ? "fixed" : ""}`}>
          <div className="btnDiv">
            <header className="headdderr">
              <h3>O'zbek Milliy Taomlari</h3>
              <div className="navigation-container">
                <button className="arrow-btn left-arrow" onClick={handlePrevious}>
                  ‹
                </button>
                <div className="center-button-container">
                  <button
                    key={currentButton.id}
                    className="CatButton center-button active"
                    onClick={() => setView(currentButton.id)}
                  >
                    {currentButton.text}
                  </button>
                </div>
                <button className="arrow-btn right-arrow" onClick={handleNext}>
                  ›
                </button>
              </div>
            </header>
          </div>
        </div>

        <img
          onClick={() => navigate("/logout")}
          className="exit-icon"
          src={exit}
          alt="exit"
        />

        {view === "edit" && (
          <div>
            <h2 style={{ color: "#1a1a2e", textAlign: "center" }}>
              Buyurtmalarni tahrirlash
            </h2>
            {filteredOrders
              .filter((item) =>
                ["PENDING", "COOKING", "READY", "COMPLETED"].includes(item.status)
              )
              .length === 0 ? (
              <p className="no-orders">
                <XCircle size={20} className="icon" /> Buyurtmalar yo'q
              </p>
            ) : (
              filteredOrders
                .filter((item) =>
                  ["PENDING", "COOKING", "READY", "COMPLETED"].includes(item.status)
                )
                .map((item) => (
                  <div key={item.id} className="zakaz-card" style={{ marginBottom: "1rem" }}>
                    <h3 className="zakaz-title">
                      <Armchair size={20} className="icon" /> Stol raqami: {item.table?.number || "—"}
                    </h3>
                    {item.orderItems?.map((orderItem) => (
                      <ul key={orderItem.id}>
                        <li style={{ marginBottom: "0.5rem", color: "#1a1a2e" }}>
                          {orderItem.product?.name || "Noma'lum"} - {orderItem.count} dona
                        </li>
                      </ul>
                    )) || (
                      <p className="no-orders">
                        <XCircle size={20} className="icon" /> Taomlar yo'q
                      </p>
                    )}
                    <p style={{ color: "black" }}>
                      <DollarSign size={20} className="icon" /> Umumiy narx: {calculateTotalPrice(item.orderItems || [])} so'm
                    </p>
                    <p style={{ color: "black" }}>
                      <Package size={20} className="icon" /> Status: {item.status}
                    </p>
                    <button
                      className="order-card__edit-btn"
                      onClick={() => handleEditOrder(item)}
                      title="Tahrirlash"
                    >
                      <Pencil size={16} className="icon" /> Tahrirlash
                    </button>
                  </div>
                ))
            )}
          </div>
        )}

        {view === "share" && (
          <div>
            <h2 style={{ color: "#1a1a2e", textAlign: "center" }}>
              Zakazlarni yetkazish
            </h2>
            {renderShareView()}
          </div>
        )}

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
                      <DollarSign size={16} className="icon" />
                      {d.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {view === "order" && (
          <section className="menu-section">
            <div className="menu-grid">
              {filteredDishes.map((d) => (
                <div key={d.id} className="menu-card">
                  <img src={`${API_BASE}${d.image}`} alt={d.name} />
                  <div className="info">
                    <h3>{d.name}</h3>
                    <p className="price">
                      <DollarSign size={16} className="icon" />
                      {d.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm
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

        {showEditModal && editingOrder && (
          <div className="modal-overlay" onClick={closeEditModal}>
            <div className="modal1" onClick={(e) => e.stopPropagation()}>
              <div className="modal__header">
                <h2 className="modal__title">Buyurtma №{editingOrder.id} ni tahrirlash</h2>
                <button className="modal__close-btn" onClick={closeEditModal}>
                  X
                </button>
              </div>

              <div className="modal__content">
                {error && <p className="error-message">{error}</p>}
                <div className="modal__items">
                  <h3>Joriy taomlar:</h3>
                  {editingOrder.orderItems.length ? (
                    <div className="modal__items-list">
                      {editingOrder.orderItems.map((item, index) => (
                        <div className="modal__item" key={item.id || `item-${index}`}>
                          <img
                            src={`${API_BASE}${item.product?.image || "/placeholder-food.jpg"}`}
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
                              <DollarSign size={16} className="icon" />
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
                    <p className="modal__empty">
                      <XCircle size={20} className="icon" /> Taomlar yo'q.
                    </p>
                  )}
                </div>

                <div className="modal__add-section">
                  <h3 className="modal__add-title">Yangi taom qo'shish:</h3>
                  <div className="modal__add-form">
                    <select
                      className="modal__select"
                      value={newItem.productId}
                      onChange={(e) =>
                        setNewItem({ ...newItem, productId: e.target.value })
                      }
                    >
                      <option value="">Taom tanlang</option>
                      {dishes.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} (
                          {product.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm)
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
                  <DollarSign size={16} className="icon" />
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

        {showSuccessModal && (
          <SuccessModal
            onClose={() => setShowSuccessModal(false)}
            onSuccess={(isValid, orderData) => {
              if (isValid) {
                socketRef.current.emit("create_order", {
                  ...orderData,
                  restaurantId: RESTAURANT_ID,
                });
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

        {showToast && (
          <div className={`toast ${toastType === "error" ? "toast-error" : "toast-success"}`}>
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default Menyu;