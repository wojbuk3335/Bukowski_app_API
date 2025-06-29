import React from 'react';
import DatePicker from 'react-datepicker';
import styles from './AddToState.module.css';

const OperationControls = ({
  operationType,
  setOperationType,
  selectedDate,
  setSelectedDate,
  selectedSellingPoint,
  setSelectedSellingPoint,
  targetSellingPoint,
  setTargetSellingPoint,
  sellingPoints,
  handleOperationTypeChange,
  isMobile
}) => {
  const CustomDateInput = React.forwardRef(({ value, onClick }, ref) => (
    <button
      className="btn btn-outline-light"
      onClick={onClick}
      ref={ref}
      style={{
        minWidth: isMobile ? '120px' : '150px',
        fontSize: isMobile ? '0.8rem' : '1rem'
      }}
    >
      {value}
    </button>
  ));

  return (
    <div className={styles.topControls}>
      <div className={styles.operationControls}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ color: 'white', fontSize: '0.9rem' }}>Tryb:</label>
          <select
            value={operationType}
            onChange={(e) => handleOperationTypeChange(e.target.value)}
            className="form-select"
            style={{
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid #666',
              maxWidth: '150px'
            }}
          >
            <option value="sprzedaz">Sprzedaż</option>
            <option value="przepisanie">Przepisanie</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ color: 'white', fontSize: '0.9rem' }}>Data:</label>
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            dateFormat="dd-MM-yyyy"
            locale="pl"
            customInput={<CustomDateInput />}
            wrapperClassName={styles.reactDatepickerWrapper}
          />
        </div>

        {operationType === 'sprzedaz' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ color: 'white', fontSize: '0.9rem' }}>Punkt sprzedaży:</label>
            <select
              value={selectedSellingPoint}
              onChange={(e) => setSelectedSellingPoint(e.target.value)}
              className="form-select"
              style={{
                backgroundColor: '#333',
                color: 'white',
                border: '1px solid #666',
                maxWidth: '150px'
              }}
            >
              <option value="">Wybierz punkt sprzedaży</option>
              {sellingPoints.map((point, index) => (
                <option key={index} value={point}>{point}</option>
              ))}
            </select>
          </div>
        )}

        {operationType === 'przepisanie' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ color: 'white', fontSize: '0.9rem' }}>Do punktu:</label>
            <select
              value={targetSellingPoint}
              onChange={(e) => setTargetSellingPoint(e.target.value)}
              className="form-select"
              style={{
                backgroundColor: '#333',
                color: 'white',
                border: '1px solid #666',
                maxWidth: '150px'
              }}
            >
              <option value="">Wybierz docelowy punkt</option>
              {sellingPoints.map((point, index) => (
                <option key={index} value={point}>{point}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationControls;
