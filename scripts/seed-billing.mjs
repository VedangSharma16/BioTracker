import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const bills = [
  {
    billNumber: "BILL-2001",
    patientId: 1,
    doctorId: 1,
    prescriptionId: 1,
    billingDate: "2026-03-20 10:00:00",
    dueDate: "2026-03-28 00:00:00",
    subtotal: "850.00",
    taxAmount: "85.00",
    discountAmount: "35.00",
    totalAmount: "900.00",
    paidAmount: "900.00",
    balanceAmount: "0.00",
    paymentStatus: "paid",
    billingNotes: "Cardiology consultation and medicine refill",
  },
  {
    billNumber: "BILL-2002",
    patientId: 2,
    doctorId: 2,
    prescriptionId: 2,
    billingDate: "2026-03-20 11:00:00",
    dueDate: "2026-03-30 00:00:00",
    subtotal: "1200.00",
    taxAmount: "120.00",
    discountAmount: "70.00",
    totalAmount: "1250.00",
    paidAmount: "500.00",
    balanceAmount: "750.00",
    paymentStatus: "partial",
    billingNotes: "Diabetes follow-up, lab review, and medicines",
  },
  {
    billNumber: "BILL-2003",
    patientId: 3,
    doctorId: 1,
    prescriptionId: null,
    billingDate: "2026-03-21 09:30:00",
    dueDate: "2026-04-02 00:00:00",
    subtotal: "600.00",
    taxAmount: "60.00",
    discountAmount: "10.00",
    totalAmount: "650.00",
    paidAmount: "300.00",
    balanceAmount: "350.00",
    paymentStatus: "partial",
    billingNotes: "General cardiac screening charges",
  },
];

for (const bill of bills) {
  await connection.execute(
    `INSERT INTO bill (bill_number, patient_id, doctor_id, prescription_id, billing_date, due_date, subtotal, tax_amount, discount_amount, total_amount, paid_amount, balance_amount, payment_status, billing_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       doctor_id = VALUES(doctor_id),
       prescription_id = VALUES(prescription_id),
       billing_date = VALUES(billing_date),
       due_date = VALUES(due_date),
       subtotal = VALUES(subtotal),
       tax_amount = VALUES(tax_amount),
       discount_amount = VALUES(discount_amount),
       total_amount = VALUES(total_amount),
       paid_amount = VALUES(paid_amount),
       balance_amount = VALUES(balance_amount),
       payment_status = VALUES(payment_status),
       billing_notes = VALUES(billing_notes)`,
    [
      bill.billNumber,
      bill.patientId,
      bill.doctorId,
      bill.prescriptionId,
      bill.billingDate,
      bill.dueDate,
      bill.subtotal,
      bill.taxAmount,
      bill.discountAmount,
      bill.totalAmount,
      bill.paidAmount,
      bill.balanceAmount,
      bill.paymentStatus,
      bill.billingNotes,
    ],
  );
}

const [billRows] = await connection.query(
  "SELECT bill_id, bill_number FROM bill WHERE bill_number IN ('BILL-2001','BILL-2002','BILL-2003') ORDER BY bill_id",
);
const billMap = new Map(billRows.map((row) => [row.bill_number, row.bill_id]));

const payments = [
  {
    billNumber: "BILL-2001",
    patientId: 1,
    paymentDate: "2026-03-20 12:00:00",
    amountPaid: "900.00",
    paymentMethod: "Card",
    transactionReference: "CARD-TXN-2001",
    paymentStatus: "completed",
    receivedBy: "Front Desk",
    paymentNotes: "Paid in full at discharge",
  },
  {
    billNumber: "BILL-2002",
    patientId: 2,
    paymentDate: "2026-03-20 13:00:00",
    amountPaid: "500.00",
    paymentMethod: "UPI",
    transactionReference: "UPI-TXN-2002",
    paymentStatus: "completed",
    receivedBy: "Admin Desk",
    paymentNotes: "Partial advance payment",
  },
  {
    billNumber: "BILL-2003",
    patientId: 3,
    paymentDate: "2026-03-21 10:15:00",
    amountPaid: "300.00",
    paymentMethod: "Cash",
    transactionReference: "CASH-2003",
    paymentStatus: "completed",
    receivedBy: "Reception",
    paymentNotes: "Part payment received",
  },
];

for (const payment of payments) {
  const [existingRows] = await connection.query(
    "SELECT payment_id FROM payment_history WHERE transaction_reference = ? LIMIT 1",
    [payment.transactionReference],
  );

  if (existingRows.length > 0) {
    continue;
  }

  await connection.execute(
    `INSERT INTO payment_history (bill_id, patient_id, payment_date, amount_paid, payment_method, transaction_reference, payment_status, received_by, payment_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      billMap.get(payment.billNumber),
      payment.patientId,
      payment.paymentDate,
      payment.amountPaid,
      payment.paymentMethod,
      payment.transactionReference,
      payment.paymentStatus,
      payment.receivedBy,
      payment.paymentNotes,
    ],
  );
}

const [billCountRows] = await connection.query("SELECT COUNT(*) AS count FROM bill");
const [paymentCountRows] = await connection.query("SELECT COUNT(*) AS count FROM payment_history");

console.log(JSON.stringify({
  bills: billCountRows[0].count,
  payments: paymentCountRows[0].count,
}));

await connection.end();
