const Order = require('../models/Order');
const nodemailer = require('nodemailer');

// Create nodemailer transporter using same config as EmailService
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'bukowskiapp.system@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
});

// Test SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP connection failed:', error);
  } else {
    // console.log('✅ SMTP connection verified successfully for orders');
  }
});

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    // Generate unique order ID
    const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    // Add validation for delivery option and address requirements
    if (orderData.customer.deliveryOption === 'shipping' && !orderData.customer.address.postalCode) {
      return res.status(400).json({
        success: false,
        message: 'Kod pocztowy jest wymagany dla opcji wysyłki'
      });
    }
    
    if ((orderData.customer.deliveryOption === 'shipping' || orderData.customer.deliveryOption === 'delivery') && !orderData.customer.address.city) {
      return res.status(400).json({
        success: false,
        message: 'Miejscowość jest wymagana dla wysyłki i dostawy'
      });
    }
    
    // Create new order document
    const order = new Order({
      ...orderData,
      orderId,
      createdBy: req.userData?.userId || 'system'
    });
    
    await order.save();
    
    res.status(201).json({
      success: true,
      message: 'Zamówienie zostało utworzone',
      orderId: order.orderId,
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas tworzenia zamówienia',
      error: error.message
    });
  }
};

// Send order email
exports.sendOrderEmail = async (req, res) => {
  try {
    const { orderId, email, orderData } = req.body;
    
    const emailHTML = `
      <h2>Potwierdzenie zamówienia</h2>
      <p><strong>Numer zamówienia:</strong> ${orderId}</p>
      
      <h3>Produkt:</h3>
      <ul>
        <li><strong>Nazwa:</strong> ${orderData.product.name || 'Nie podano'}</li>
        <li><strong>Kolor:</strong> ${orderData.product.color || 'Nie podano'}</li>
        <li><strong>Rozmiar:</strong> ${orderData.product.size || 'Nie podano'}</li>
        <li><strong>Opis:</strong> ${orderData.product.description || 'Nie podano'}</li>
      </ul>
      
      <h3>Dane klienta:</h3>
      <ul>
        <li><strong>Imię i nazwisko:</strong> ${orderData.customer.name}</li>
        <li><strong>Telefon:</strong> ${orderData.customer.phone}</li>
        <li><strong>Email:</strong> ${orderData.customer.email || 'Nie podano'}</li>
        <li><strong>Sposób dostawy:</strong> ${
          orderData.customer.deliveryOption === 'shipping' ? 'Wysyłka pocztowa' :
          orderData.customer.deliveryOption === 'delivery' ? 'Dostawa kurierska' :
          'Odbiór osobisty'
        }</li>
        ${orderData.customer.deliveryOption !== 'pickup' ? `<li><strong>Adres:</strong> ${orderData.customer.address.postalCode ? orderData.customer.address.postalCode + ' ' : ''}${orderData.customer.address.city}${orderData.customer.address.street ? ', ' + orderData.customer.address.street : ''}${orderData.customer.address.houseNumber ? ' ' + orderData.customer.address.houseNumber : ''}</li>` : ''}
      </ul>
      
      <h3>Rozliczenie:</h3>
      <ul>
        <li><strong>Cena całkowita:</strong> ${orderData.payment.totalPrice} zł</li>
        <li><strong>Zaliczka:</strong> ${orderData.payment.deposit} zł</li>
        <li><strong>Kwota pobrania:</strong> ${orderData.payment.cashOnDelivery} zł ${
          orderData.customer.deliveryOption === 'shipping' ? '(z przesyłką +20 zł)' :
          orderData.customer.deliveryOption === 'delivery' ? '(bez kosztów przesyłki)' :
          '(odbiór osobisty)'
        }</li>
        <li><strong>Dokument:</strong> ${orderData.payment.documentType === 'invoice' ? 'Faktura' : 'Paragon'}</li>
        ${orderData.payment.nip ? `<li><strong>NIP:</strong> ${orderData.payment.nip}</li>` : ''}
      </ul>
      
      <h3>Data realizacji:</h3>
      <p>${new Date(orderData.realizationDate).toLocaleDateString('pl-PL')}</p>
      
      <p><em>Zamówienie zostało złożone: ${new Date(orderData.createdAt).toLocaleString('pl-PL')}</em></p>
    `;
    
    const fromAddress = process.env.EMAIL_FROM || 'BukowskiApp <bukowskiapp.system@gmail.com>';
    let customerInfo = null;
    
    // Send email to customer only if email is provided
    if (email && email.trim()) {
      const customerMailOptions = {
        from: fromAddress,
        to: email,
        subject: `Potwierdzenie zamówienia ${orderId} - BukowskiApp`,
        replyTo: 'BukowskiApp <bukowskiapp.system@gmail.com>',
        headers: {
          'X-Sender': 'BukowskiApp',
          'X-Application': 'BukowskiApp Order System'
        },
        html: emailHTML
      };

      console.log(`📧 Wysyłanie emaila potwierdzenia zamówienia ${orderId} do klienta: ${email}`);
      customerInfo = await transporter.sendMail(customerMailOptions);
      console.log('✅ Email do klienta wysłany pomyślnie:', customerInfo.messageId);
    } else {
      console.log('ℹ️ Email klienta nie został podany, wysyłanie tylko powiadomienia do właściciela');
    }
    
    // Also send notification email to business owner
    const businessEmail = 'bukowski@interia.eu';
    const businessMailOptions = {
      from: `"Bukowski App" <${process.env.SMTP_USER || 'bukowskiapp.system@gmail.com'}>`,
      to: businessEmail,
      subject: `NOWE ZAMÓWIENIE ${orderId} - Powiadomienie dla właściciela`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #d4edda; padding: 20px; border-radius: 10px; border-left: 5px solid #28a745; margin-bottom: 20px;">
            <h2 style="color: #155724; margin: 0;">🛍️ NOWE ZAMÓWIENIE OTRZYMANE!</h2>
            <p style="color: #155724; margin: 10px 0 0 0;">Zamówienie nr: <strong>${orderId}</strong></p>
          </div>
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            ${emailHTML}
            <hr style="border: none; border-top: 2px solid #28a745; margin: 30px 0;">
            <p style="color: #28a745; font-weight: bold; text-align: center;">
              📋 To jest kopia zamówienia wysłana automatycznie do właściciela sklepu.
            </p>
          </div>
        </div>
      `
    };
    
    const businessInfo = await transporter.sendMail(businessMailOptions);
    console.log('✅ Email do właściciela wysłany pomyślnie:', businessInfo.messageId);
    
    res.status(200).json({
      success: true,
      message: customerInfo 
        ? 'Emaile zostały wysłane do klienta i właściciela' 
        : 'Email powiadomienia został wysłany do właściciela',
      customerEmailId: customerInfo?.messageId || null,
      businessEmailId: businessInfo.messageId,
      emailsSent: {
        customer: !!customerInfo,
        business: true
      }
    });
  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error('Szczegóły błędu:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    
    res.status(500).json({
      success: false,
      message: 'Błąd podczas wysyłania emaila',
      error: error.message,
      details: error.code || 'Unknown error'
    });
  }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas pobierania zamówień',
      error: error.message
    });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Zamówienie nie zostało znalezione'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas pobierania zamówienia',
      error: error.message
    });
  }
};

// Complete order and send shipping notification
exports.completeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { shippingDate, status } = req.body;

    if (!shippingDate) {
      return res.status(400).json({
        success: false,
        message: 'Data wysyłki jest wymagana'
      });
    }

    // Find and update order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Zamówienie nie zostało znalezione'
      });
    }

    // Update order status
    order.status = status || 'zrealizowano';
    order.shippingDate = new Date(shippingDate);
    order.completedAt = new Date();
    
    await order.save();

    // Send shipping notification email to customer
    await sendShippingNotification(order, shippingDate);

    res.status(200).json({
      success: true,
      message: 'Zamówienie zostało zrealizowane i klient otrzymał powiadomienie',
      data: order
    });
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas realizacji zamówienia',
      error: error.message
    });
  }
};

// Send shipping notification email
const sendShippingNotification = async (order, shippingDate) => {
  try {
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const mailOptions = {
      from: `"Bukowski App" <${process.env.SMTP_USER || 'bukowskiapp.system@gmail.com'}>`,
      to: order.customer.email,
      subject: `🚚 Twoje zamówienie ${order.orderId} zostało zrealizowane`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">✅ Zamówienie zrealizowane!</h2>
          <p>Dzień dobry <strong>${order.customer.name}</strong>,</p>
          
          <p>Mamy miłą wiadomość! Twoje zamówienie zostało zrealizowane i jest gotowe do wysyłki.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">📦 Szczegóły zamówienia:</h3>
            <p><strong>Numer zamówienia:</strong> ${order.orderId}</p>
            <p><strong>Produkt:</strong> ${order.product.name}</p>
            <p><strong>Planowana data wysyłki:</strong> <span style="color: #28a745; font-weight: bold;">${formatDate(shippingDate)}</span></p>
            
            ${order.customer.deliveryOption === 'shipping' ? `
              <p><strong>Adres wysyłki:</strong><br>
              ${order.customer.address.street} ${order.customer.address.houseNumber}<br>
              ${order.customer.address.postalCode} ${order.customer.address.city}</p>
            ` : order.customer.deliveryOption === 'delivery' ? `
              <p><strong>Adres dostawy:</strong><br>
              ${order.customer.address.street} ${order.customer.address.houseNumber}<br>
              ${order.customer.address.city}</p>
            ` : `
              <p><strong>Odbiór osobisty</strong> - prosimy o kontakt w celu umówienia terminu odbioru</p>
            `}
          </div>
          
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #17a2b8;">💰 Rozliczenie:</h4>
            <p><strong>Kwota pobrania:</strong> ${order.payment.cashOnDelivery.toFixed(2)} zł</p>
            <p><strong>Dokument:</strong> ${order.payment.documentType === 'invoice' ? 'Faktura' : 'Paragon'}</p>
          </div>
          
          <p>W przypadku pytań prosimy o kontakt:</p>
          <p>📧 Email: bukowski@interia.eu<br>
          📱 Telefon: 604971789</p>
          
          <p style="margin-top: 30px;">Dziękujemy za zaufanie!</p>
          <p><strong>Zespół Bukowski App</strong></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Shipping notification sent to ${order.customer.email} for order ${order.orderId}`);
  } catch (error) {
    console.error('❌ Error sending shipping notification:', error);
    throw error;
  }
};

// Revert order back to pending status
exports.revertOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Find order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Zamówienie nie zostało znalezione'
      });
    }

    // Check if order is completed
    if (order.status !== 'zrealizowano') {
      return res.status(400).json({
        success: false,
        message: 'Można przywrócić tylko zrealizowane zamówienia'
      });
    }

    // Revert order status
    order.status = 'pending';
    order.shippingDate = null;
    order.completedAt = null;
    
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Zamówienie zostało przywrócone do statusu aktywnego',
      data: order
    });
  } catch (error) {
    console.error('Error reverting order:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas przywracania zamówienia',
      error: error.message
    });
  }
};