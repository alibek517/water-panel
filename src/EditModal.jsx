import React, { useState, useEffect } from 'react';
import './menyu.css';
import axios from 'axios';

function EditModal({ zakaz, onClose }) {
  const [orderItems, setOrderItems] = useState(zakaz?.orderItems || []);
  const [newItem, setNewItem] = useState({ productId: "", count: 1 });
  const [products, setProducts] = useState([]);

  // Загрузка блюд
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://109.172.37.41:4000/product');
        setProducts(response.data);
      } catch (error) {
        console.error("❌ Ошибка при загрузке блюд:", error);
        alert("❌ Ошибка при загрузке блюд!");
      }
    };

    fetchProducts();
  }, []);

  const changeCount = (index, delta) => {
    setOrderItems(prev => {
      const updated = [...prev];
      const item = updated[index];
      const newCount = Math.max(0, item.count + delta);

      if (newCount === 0) {
        updated.splice(index, 1);
      } else {
        updated[index] = { ...item, count: newCount };
      }

      // Отправка на backend
      axios.patch(`http://109.172.37.41:4000/order/${zakaz.id}`, {
        orderItems: updated.map(i => ({
          productId: i.productId,
          count: i.count
        })),
        status: zakaz.status
      }).then(res => {
        console.log("✅ Обновлено на backend:", res.data);
      }).catch(err => {
        console.error("❌ Ошибка при PATCH (changeCount):", err.response?.data || err.message);
        alert("❌ Ошибка при сохранении!");
      });

      return updated;
    });
  };

  const handleAddItem = async () => {
    if (!newItem.productId || newItem.count <= 0) {
      alert("Выберите блюдо и количество больше 0.");
      return;
    }

    const productId = parseInt(newItem.productId);
    const updated = [...orderItems];
    const existingIndex = updated.findIndex(item => item.productId === productId);

    if (existingIndex >= 0) {
      updated[existingIndex].count += newItem.count;
    } else {
      updated.push({ productId, count: newItem.count });
    }

    setOrderItems(updated);

    try {
      const response = await axios.patch(`http://109.172.37.41:4000/order/${zakaz.id}`, {
        orderItems: updated,
        status: zakaz.status
      });

      console.log("✅ Добавлено и сохранено:", response.data);
      alert("✅ Блюдо добавлено и сохранено!");
    } catch (error) {
      console.error("❌ Ошибка при добавлении блюда:", error.response?.data || error.message);
      alert("❌ Не удалось добавить блюдо.");
    }

    setNewItem({ productId: "", count: 1 });
  };

  const handleSave = async () => {
    try {
      const payload = orderItems.map(i => ({
        productId: i.productId,
        count: i.count
      }));

      const response = await axios.patch(`http://109.172.37.41:4000/order/${zakaz.id}`, {
        orderItems: payload,
        status: zakaz.status
      });

      console.log("✅ Сохранено:", response.data);
      alert("✅ Изменения сохранены!");
      onClose();
    } catch (error) {
      console.error("❌ Ошибка при сохранении:", error.response?.data || error.message);
      alert("❌ Не удалось сохранить изменения.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-edit">
        <h2>Редактировать заказ — Стол {zakaz?.tableNumber || "?"}</h2>
        <ul>
          {orderItems.map((item, i) => {
            const product = products.find(p => p.id === item.productId);
            return (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {product?.name || "❓ Неизвестно"} — {item.count} шт.
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button className='plsmns' onClick={() => changeCount(i, -1)}>-</button>
                  <button className='plsmns' onClick={() => changeCount(i, 1)}>+</button>
                </div>
              </li>
            );
          })}
        </ul>
        <div style={{ marginTop: '10px' }}>
          <select
            value={newItem.productId}
            onChange={(e) => setNewItem({ ...newItem, productId: e.target.value })}
          >
            <option value="">Выберите блюдо</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={newItem.count}
            onChange={(e) => setNewItem({ ...newItem, count: parseInt(e.target.value) || 1 })}
            style={{ width: '50px', marginLeft: '5px' }}
          />
          <button
            onClick={handleAddItem}
            style={{
              padding: "5px 10px",
              background: "#4CAF50",
              color: "white",
              border: "none",
              cursor: "pointer",
              marginLeft: '5px'
            }}
          >
            Добавить
          </button>
        </div>
        <div style={{ marginTop: '15px' }}>
          <button onClick={handleSave} style={{ marginRight: '10px' }}>Сохранить</button>
          <button onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

export default EditModal;
