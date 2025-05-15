  import React, { useRef, useState } from 'react';
  import './Modal.css';

  function Modal({ orderCounts, dishes, onClose, onConfirm  }) {
    const modalRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [topPosition, setTopPosition] = useState(100);
    const [offsetY, setOffsetY] = useState(0);

    const handleMouseDown = (e) => {
      setIsDragging(true);
      const rect = modalRef.current.getBoundingClientRect();
      setOffsetY(e.clientY - rect.top);
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setTopPosition(e.clientY - offsetY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const orderedItems = Object.keys(orderCounts)
      .map(dishId => {
        const dish = dishes.find(d => d.id === parseInt(dishId));
        return {
          name: dish?.name,
          count: orderCounts[dishId],
          price: dish?.price,
        };
      })
      .filter(item => item.count > 0); 

    const totalPrice = orderedItems.reduce((total, item) => total + item.count * item.price, 0);
    function formatPrice(price) {
      (price) => `${price.toLocaleString()} so'm`;
      const priceStr = price.toString();
      const formatted = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      return formatted + ' so‘m';
    }

    return (
      <div
    className="modal-overlay"
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUp}
  >
    <div
      className="modal-content"
      ref={modalRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        top: topPosition,
        left: '50%',
        transform: 'translateX(-50%)',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <h2>Buyurtma</h2>
      <div className="order-list">
        {orderedItems.length > 0 ? (
          orderedItems.map((item, index) => (
            <div key={index} className="order-item">
              <span>{item.name}</span>
              <span>{item.count} ta</span>
              <span>{formatPrice(item.price)}</span>
              <span>{formatPrice(item.price * item.count)}</span>
            </div>
          ))
        ) : (
          <p>Hozircha buyurtmalar mavjud emas.</p>
        )}
      </div>


      <div className="total">
        <div className='display-spea-betw'><h3>Jami:</h3> <h3>{formatPrice(totalPrice)}</h3></div>
        <div className="display-spea-betw"><p>Xizmat haqi (4%): </p> <p> {formatPrice(totalPrice * 0.04)}</p></div>
        <div className="display-spea-betw"><h3>Umumiy to‘lov: </h3> <h3> {formatPrice(totalPrice * 1.04)}</h3></div>
      </div>

      <button className="close-btn" onClick={onClose}>X</button>
      <button className="confirm-btn" onClick={onConfirm}>Tasdiqlash</button>
    </div>
  </div>

    );
  }

  export default Modal;
