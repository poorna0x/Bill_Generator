// Capitalizes first letter of a string input field value
function capitalizeFirstLetter(input) {
  let val = input.value.trim();
  if (val.length > 0) {
    input.value = val.charAt(0).toUpperCase() + val.slice(1);
  }
}

// Capitalizes first letter of customer name input separately
function capitalizeCustomerName() {
  const custNameInput = document.getElementById('customerName');
  let val = custNameInput.value.trim();
  if (val.length > 0) {
    custNameInput.value = val.charAt(0).toUpperCase() + val.slice(1);
  }
}

// Adds a new normal item row to the items container
function addItem() {
  const itemsDiv = document.getElementById('items');
  const div = document.createElement('div');
  div.classList.add('item-row');
  div.dataset.type = 'item';
  div.innerHTML = `
    <input type="text" placeholder="Item Name" class="item-name">
    <input type="number" placeholder="Qty" class="qty" min="1" step="1" value="1">
    <input type="number" placeholder="Rate" class="rate" min="0" step="0.01">
    <button type="button" class="remove-btn" onclick="removeItem(this)">x</button>
  `;
  itemsDiv.appendChild(div);
  attachListeners(div);
  updatePreview();
}

// Adds an additional charge row (Qty & Rate NA) to the items container
function addAdditional() {
  const itemsDiv = document.getElementById('items');
  const div = document.createElement('div');
  div.classList.add('item-row');
  div.dataset.type = 'additional';
  div.innerHTML = `
    <input type="text" placeholder="Description" class="item-name">
    <input type="text" placeholder="Qty" class="qty" value="NA" readonly style="background:#eee; text-align:center;">
    <input type="text" placeholder="Rate" class="rate" value="NA" readonly style="background:#eee; text-align:center;">
    <input type="number" placeholder="Price" class="price" min="0" step="0.01" style="flex:1;">
    <button type="button" class="remove-btn" onclick="removeItem(this)">x</button>
  `;
  itemsDiv.appendChild(div);
  attachListeners(div);
  updatePreview();
}

// Removes an item or additional charge row
function removeItem(btn) {
  btn.parentElement.remove();
  updatePreview();
}

// Attach event listeners to input fields inside a given row
function attachListeners(row) {
  const inputs = row.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      if (input.classList.contains('item-name')) {
        capitalizeFirstLetter(input);
      }
      updatePreview();
    });
  });
}

// Updates the invoice preview: customer details, items table, totals
function updatePreview() {
  capitalizeCustomerName();

  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();

  // Display "Bill To" only if customer name is entered
  document.getElementById('billTo').textContent = name ? `Bill To: ${name}${phone ? ' (' + phone + ')' : ''}` : '';

  // Set current date
  const today = new Date();
  document.getElementById('billDate').textContent = `Date: ${today.toLocaleDateString()}`;

  // Clear previous table rows
  const tbody = document.querySelector('#itemsTable tbody');
  tbody.innerHTML = '';

  let subtotal = 0;

  // Process all item rows
  document.querySelectorAll('#items .item-row').forEach(row => {
    const type = row.dataset.type;
    let description = row.querySelector('.item-name')?.value.trim() || '';

    if (!description) return; // skip empty description rows

    if (type === 'item') {
      // Normal item with Qty and Rate
      let qtyInput = row.querySelector('.qty');
      let rateInput = row.querySelector('.rate');

      let qty = parseInt(qtyInput?.value);
      let rate = parseFloat(rateInput?.value);

      // Validate qty and rate values
      if (isNaN(qty) || qty < 1) {
        qty = 1;
        qtyInput.value = qty;
      }
      if (isNaN(rate) || rate < 0) {
        rate = 0;
        rateInput.value = rate.toFixed(2);
      }

      let amount = qty * rate;
      subtotal += amount;

      // Add a row to the invoice table
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${description}</td>
        <td>${qty}</td>
        <td>${rate.toFixed(2)}</td>
        <td>${amount.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);

    } else if (type === 'additional') {
      // Additional charge: Qty & Rate NA, price from price input
      let priceInput = row.querySelector('.price');
      let price = parseFloat(priceInput?.value);

      if (isNaN(price) || price < 0) {
        price = 0;
        priceInput.value = price.toFixed(2);
      }
      subtotal += price;

      // Add a row to the invoice table
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${description}</td>
        <td>NA</td>
        <td>NA</td>
        <td>${price.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    }
  });

  // Calculate discount
  const discountVal = parseFloat(document.getElementById('discountValue').value) || 0;
  const discountType = document.getElementById('discountType').value;
  let discountAmount = 0;

  if (discountVal > 0) {
    if (discountType === 'percent') {
      discountAmount = (subtotal * discountVal) / 100;
      if (discountAmount > subtotal) discountAmount = subtotal; // cap discount to subtotal
    } else {
      discountAmount = discountVal;
      if (discountAmount > subtotal) discountAmount = subtotal; // cap discount to subtotal
    }
  }

  // Update totals in preview
  document.getElementById('subtotal').textContent = subtotal.toFixed(2);
  document.getElementById('discountAmount').textContent = discountAmount.toFixed(2);

  const grandTotal = subtotal - discountAmount;
  document.getElementById('grandTotal').textContent = grandTotal.toFixed(2);
}

// Generates PDF from invoice preview using html2canvas and jsPDF
function generatePDF() {
  updatePreview(); // Ensure preview is updated before PDF

  const invoice = document.getElementById("invoice");

  html2canvas(invoice, { scale: 2 }).then(canvas => {
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const pxToMmRatio = 0.264583; // px to mm approx
    const margin = 5;

    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * pxToMmRatio) * (imgWidth / (canvas.width * pxToMmRatio));

    if (imgHeight < pageHeight - margin * 2) {
      pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
    } else {
      // For tall content split pages
      let heightLeft = imgHeight;
      let yOffset = 0;

      while (heightLeft > 0) {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;

        // Calculate slice height in px for this page
        const maxPageHeightPx = ((pageHeight - margin * 2) / pxToMmRatio) * (canvas.width * pxToMmRatio) / imgWidth;
        pageCanvas.height = Math.min(canvas.height - yOffset, maxPageHeightPx);

        const ctx = pageCanvas.getContext('2d');
        ctx.drawImage(
          canvas,
          0, yOffset,
          canvas.width,
          pageCanvas.height,
          0, 0,
          canvas.width,
          pageCanvas.height
        );

        const pageData = pageCanvas.toDataURL('image/png');
        const pageImgHeight = (pageCanvas.height * pxToMmRatio) * (imgWidth / (canvas.width * pxToMmRatio));

        pdf.addImage(pageData, "PNG", margin, margin, imgWidth, pageImgHeight);

        heightLeft -= pageImgHeight;
        yOffset += pageCanvas.height;

        if (heightLeft > 0) {
          pdf.addPage();
        }
      }
    }

    const customerName = document.getElementById('customerName').value.trim();
    const filename = (customerName ? customerName.replace(/\s+/g, '_') + '_ROSERVICE_BILL.pdf' : 'ROSERVICE_BILL.pdf');

    pdf.save(filename);
  });
}

// Initialize listeners on page load
window.addEventListener('DOMContentLoaded', () => {
  // Attach input listeners for customer name and phone
  document.getElementById('customerName').addEventListener('input', () => {
    capitalizeCustomerName();
    updatePreview();
  });
  document.getElementById('customerPhone').addEventListener('input', updatePreview);

  // Attach discount inputs listeners
  document.getElementById('discountValue').addEventListener('input', updatePreview);
  document.getElementById('discountType').addEventListener('change', updatePreview);

  // Attach listeners to existing item rows
  document.querySelectorAll('#items .item-row').forEach(attachListeners);

  // Initial update
  updatePreview();
});
