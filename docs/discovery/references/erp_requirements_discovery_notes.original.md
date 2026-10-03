# Tawsel / Shipping System — Requirements Discovery Notes

> **Purpose:** This document organizes the points mentioned in the provided WhatsApp/transcribed discussion and turns unclear areas into questions for requirements discovery.
>
> **Important:** This is a discovery document, not a final system specification. Questions and assumptions below are intentionally left open where the source material does not provide enough information.

---

## 1. Main Topics to Clarify

The discussion identified these main areas:

- Who will use the system?
- Whether the merchant/brand will access the system directly.
- Order/shipment data and the details stored for each shipment.
- Shipment/order statuses.
- Collection/payment methods.
- Branches and branch hierarchy.
- Driver access and what drivers can see.
- Data-entry responsibilities.
- Accounting access and reporting.
- How the system is connected to the mobile application.
- How orders move from system entry to the driver's application.
- How the service/company is charged or priced.

---

# 2. Users & System Access

## 2.1 Confirmed / Mentioned

The system is primarily used by **company employees**.

The discussion mentions different levels of access:

### Branch Manager
- Each branch has a manager.
- The Branch Manager can see information related to their branch.
- Example mentioned: seeing what the branch received.

### Operations Manager
- There is a manager above the branch managers.
- This role may be able to see information across multiple branches.

### Driver / Delivery Representative
- The driver should only see what belongs to them.
- The driver should not have access to everything in the system.

### Accountant
- The accountant has broad access.
- Can open orders across brands.
- Can filter orders.
- Can filter by date.
- Can filter by order status.
- Can generate reports for accounting/settlement purposes.

### Data Entry Employee
- Responsible for entering order/shipment data into the system.

### Branch Employee / Order Handover Employee
- There is an employee who can see the orders available in a branch.
- The exact responsibilities of this employee need clarification.

---

## 2.2 Access / Permission Questions

- What are all system roles exactly?
- What can each role **view**?
- What can each role **create**?
- What can each role **edit**?
- What can each role **delete/cancel**?
- What can each role **change in an order's status**?
- Can a user belong to more than one branch?
- Can a user have more than one role?
- Can access be customized per user in addition to role-based permissions?
- Can the Operations Manager see all branches?
- Can a Branch Manager see only their own branch?
- Can a driver see only assigned orders?
- Can a driver see historical orders or only current assignments?

---

# 3. Merchant / Brand Access

## 3.1 Current Understanding

The main system users are company employees.

It is **not yet confirmed** whether merchants/brands will have their own accounts.

A possible merchant-facing area was mentioned where the merchant could see the **status of their orders**.

This point should remain open until clarified.

## 3.2 Questions

- Will the merchant have a login/account?
- If yes, is the account for the merchant or for each brand?
- Can one merchant have multiple brands?
- What can the merchant see?
  - Orders
  - Order status
  - Reports
  - Returns
  - Financial information
  - Settlements
- Can the merchant create orders?
- Can the merchant edit orders?
- Can the merchant cancel orders?
- Can the merchant see all orders or only a subset?
- Can merchant users have different permissions?

---

# 4. Merchant vs. Brand Structure

The discussion mentions that the company works with multiple **brands**.

Example:
- The company may work with around 10 brands.
- Each brand has its own name.
- Opening a brand shows its shipments/orders from the beginning of the relationship up to the latest order.

## Questions

The relationship between **Merchant** and **Brand** is not yet clear.

Need to determine whether the structure is:

```text
Merchant
└── Brand
    └── Orders
```

or simply:

```text
Brand
└── Orders
```

Questions:

- Is a Merchant different from a Brand?
- Can one Merchant own multiple Brands?
- Does every Brand have its own orders?
- Does each Brand have different pricing/fees?
- Does each Brand have different operational rules?
- Can an employee be assigned to specific brands only?
- Are reports generated per Brand, per Merchant, or both?

---

# 5. Order / Shipment Data

## 5.1 Mentioned Shipment Fields

The discussion explicitly mentions the following shipment/order data:

- Brand name
- Customer name
- Phone number
- Address
- Shipment/order price
- Comment / note

Example comment:

> Whether there is inspection before receiving the shipment or not.

The source describes data entry as entering the shipment data into the system, including name, phone number, address, and price.

## 5.2 Questions

Need to clarify whether an order also contains:

- Order ID
- Tracking number / shipment number
- Merchant order number
- Product/item details
- Quantity
- Product price
- COD amount
- Delivery fee
- Weight
- Dimensions
- Shipment type
- Delivery notes
- Customer notes
- Payment method
- Branch
- Assigned driver
- Creation date/time
- Expected delivery date
- Return information
- Failure reason
- Proof of delivery

Also:

- Which fields are required?
- Which fields are optional?
- Can order data be edited after creation?
- Who is allowed to edit it?
- Is there an audit trail for edits?

---

# 6. Order / Shipment Statuses

## 6.1 Statuses Mentioned

The discussion explicitly mentions:

- Returned
- Under Delivery / Out for Delivery
- Delivered
- Partially Delivered

## 6.2 Status Lifecycle Questions

The complete order lifecycle is not yet defined.

Need to clarify whether the workflow includes stages such as:

```text
Order Created
      ↓
At Branch
      ↓
Assigned to Driver
      ↓
Out for Delivery
      ↓
Delivered
```

with alternative outcomes such as:

```text
Partially Delivered
Returned
```

The following possible statuses were **not confirmed** and should only be asked about:

- Cancelled
- Failed Delivery
- Postponed
- Rescheduled
- Customer Not Available
- Wrong Address
- Customer Refused
- Damaged
- Lost

Questions:

- What are all possible statuses?
- Who can change each status?
- Can a status move backward?
- Can a delivered order be reopened?
- Does every status require a reason?
- Does a returned order require a return reason?
- Does partial delivery have specific details?
- Are status changes logged with user/date/time?

---

# 7. Data Entry

## Confirmed / Mentioned

Data Entry is responsible for entering order/shipment information into the system.

The basic idea is:

```text
Shipment data
     ↓
Data Entry
     ↓
System
```

## Questions

- Is data entered manually only?
- Is there bulk Excel/CSV upload?
- Can orders enter through API/integration?
- Can Data Entry edit orders?
- Can Data Entry delete/cancel orders?
- Can Data Entry see orders after creating them?
- Is Data Entry assigned to a specific branch?
- Does Data Entry assign the branch?
- Does Data Entry assign the driver?
- Is there validation before an order is accepted?

---

# 8. Branches

## 8.1 Mentioned Structure

Each branch has a manager.

There is also a higher-level manager above the branch managers.

Current conceptual structure:

```text
Operations Manager
        │
 ┌──────┼──────┐
 │      │      │
Branch Branch Branch
Manager Manager Manager
 │
Branch Staff
```

This is only a representation of the hierarchy mentioned in the discussion and still needs confirmation.

## 8.2 Questions

- Is every order associated with a branch?
- Which branch does an order belong to?
- Who decides the branch?
- Is it the origin branch?
- Can an order move between branches?
- Can an order be transferred from one branch to another?
- Who can perform a transfer?
- Is there a main/HQ branch?
- Can a user belong to multiple branches?
- Does each branch have its own drivers?
- Can drivers work across branches?

---

# 9. Branch Employee / Order Handover

The discussion mentions an employee who can see the orders in a branch.

The stated idea is:

> This employee should be able to see all orders in the branch.

The exact role and workflow are not yet defined.

## Questions

- What is this employee's exact role?
- Does this employee receive orders into the branch?
- Does this employee hand orders to drivers?
- Does this employee assign orders to drivers?
- Does this employee scan orders?
- Does this employee change order status?
- Does this employee perform dispatch?
- Is there a handover confirmation?
- Is there a record of which driver received which orders?
- Is a signature/confirmation required when the driver receives orders?

---

# 10. Drivers

## 10.1 Mentioned

The driver should only see the orders assigned to them.

Drivers may have codes/identifiers in the system.

The discussion also suggests that after orders are entered/read in the system, they become available to the driver application.

## Questions

- Does every driver have an account?
- Does every driver have a Driver ID / Driver Code?
- Who assigns orders to drivers?
- Can a driver accept/reject an assignment?
- What can a driver do with an order?
- Can the driver change the order status?
- Can the driver mark an order as delivered?
- Can the driver mark an order as failed?
- Can the driver mark an order as returned?
- Can the driver record partial delivery?
- Does delivery require proof?
  - Signature?
  - OTP?
  - Photo?
  - GPS?
- Does the driver collect cash?
- If yes, how is collected cash recorded?

---

# 11. Collection / Payment Methods

## 11.1 Mentioned Methods

The following methods were mentioned:

- Cash
- Bank deposit
- Bank transfer

## 11.2 Important Clarification

It is not yet clear what exactly these payment/collection methods refer to.

They could refer to:

1. Customer → Company payment
2. Merchant → Company payment
3. COD collection from the customer
4. Another internal settlement process

This must be clarified before designing the financial workflow.

## Questions

- Who is paying whom?
- Is COD part of the system?
- Does the driver collect COD?
- Is the collected amount recorded against the order?
- Is there a cash reconciliation process?
- When does the driver hand collected cash to the company?
- Is there a branch-level cash settlement?
- Is there a merchant settlement?
- Are bank transfers recorded manually?
- Is proof of bank transfer stored?
- Is there a payment status?
- Is there a settlement status?

---

# 12. Accounting

## 12.1 Mentioned

The accountant has broad access to orders.

The accountant can:

- Open orders.
- Open any brand.
- Filter orders.
- Filter by date.
- Filter by order status.
- Generate reports for accounting purposes.

The source specifically mentions filtering orders by date/status and producing reports to account for people.

## 12.2 Questions

Need to clarify exactly what the accountant is accounting for:

- Merchant settlements?
- COD?
- Delivery fees?
- Company revenue?
- Driver cash?
- Branch cash?
- Commissions?
- Returns?
- Other fees?

Also:

- Are invoices required?
- Are settlement statements required?
- Are driver settlements required?
- Are merchant settlements required?
- Does a report need approval/finalization?
- Are financial records editable?
- Is there an accounting system integrated with this system?

---

# 13. System ↔ Mobile Application Integration

A key point raised in the discussion is that the system is expected to be connected to the application.

The expected idea is roughly:

```text
Order entered/read in System
          ↓
       Integration
          ↓
      Mobile App
          ↓
        Driver
```

The exact architecture is not yet confirmed.

## Questions

- What exactly is the "system" being discussed?
- What exactly is the mobile application?
- Is the system already connected to the mobile app?
- Is the connection through an API?
- When an order is created, when does it appear in the app?
- Does it appear immediately?
- Does it first need to be assigned to a driver?
- What data is sent from the system to the app?
- What data is sent from the app back to the system?
- Which system is the source of truth for order status?
- Which system is the source of truth for driver assignments?
- What happens if the mobile app is offline?
- Are updates synchronized later?

---

# 14. Order → Driver Flow

This is an important workflow to clarify.

A possible flow based on the discussion is:

```text
Data Entry
    ↓
Create Order
    ↓
Order exists in System
    ↓
Branch
    ↓
Assign to Driver
    ↓
Driver sees Order in Mobile App
    ↓
Delivery
    ↓
Status updated
    ↓
System receives the update
```

**This flow is not confirmed yet.**

Questions:

- Who creates the order?
- Who decides its branch?
- Who assigns the driver?
- When does the driver receive it?
- Can assignment happen automatically?
- Can an order be reassigned?
- What happens when a driver is unavailable?
- Does the branch confirm the physical handover?
- Which system stores the final delivery status?

---

# 15. Pricing / Charging Question

The final discussion includes a question about whether the company should be charged based on:

- Money
- Time

The exact meaning of this statement is unclear from the source.

Therefore this should be asked directly rather than interpreted.

## Question

> What exactly do we mean by charging based on money or time? What service/process is being priced, and who is being charged?

---

# 16. Suggested Requirement-Discovery Questions

For the next discussion, these are the most important questions to ask.

## A. Users & Permissions

1. Who are all the users of the system?
2. What are all the roles?
3. What can each role view?
4. What can each role create/edit/delete?
5. Who can change order statuses?
6. Can one user belong to multiple branches?
7. Can one user have multiple roles?
8. Does the merchant have a login?

## B. Merchant / Brand

9. What is the difference between Merchant and Brand?
10. Can one Merchant have multiple Brands?
11. Does each Brand have separate orders?
12. Are pricing and fees different per Brand?
13. Can employees be restricted to specific Brands?

## C. Orders

14. What are all the fields required for an order?
15. Is there an Order ID / Tracking Number?
16. Is there product/item information?
17. Is there quantity?
18. Is there COD?
19. What is the complete order lifecycle?
20. What are all possible statuses?
21. Who can change each status?

## D. Branches

22. What is the exact branch hierarchy?
23. What does the Branch Manager control?
24. What does the Operations Manager control?
25. Can orders move between branches?
26. Who handles driver handover?

## E. Drivers

27. How are orders assigned to drivers?
28. Who performs the assignment?
29. What can the driver do in the app?
30. What counts as proof of delivery?
31. Does the driver collect money?
32. How is driver cash reconciled?

## F. Payments / Accounting

33. What do Cash / Bank Deposit / Bank Transfer refer to?
34. Is this COD or merchant/company settlement?
35. What exactly does the accountant calculate?
36. What reports are required?
37. Are merchant settlements required?
38. Are driver settlements required?

## G. Integration

39. How does the system communicate with the mobile app?
40. What happens when an order is entered?
41. When does it appear in the driver's app?
42. What data goes from the system to the app?
43. What data comes back from the app?
44. Which system is the source of truth?

---

# 17. Current Known vs. Unknown

| Area | Current understanding | Status |
|---|---|---|
| Main users | Company employees | Mentioned |
| Merchant login | Possibly, but not confirmed | Needs clarification |
| Data Entry | Enters order/shipment data | Mentioned |
| Branch Manager | One per branch | Mentioned |
| Operations Manager | Above branch managers | Mentioned |
| Driver access | Driver sees their own orders | Mentioned |
| Accountant | Broad order/brand access + filters/reports | Mentioned |
| Brands | Multiple brands, each with orders | Mentioned |
| Order fields | Brand, name, phone, address, price, comments | Mentioned |
| Order statuses | Returned, under delivery, delivered, partial delivery | Mentioned |
| Payment methods | Cash, bank deposit, bank transfer | Mentioned |
| Exact payment meaning | Unknown | Needs clarification |
| Branch transfer | Unknown | Needs clarification |
| Driver assignment | Unknown | Needs clarification |
| Full order lifecycle | Unknown | Needs clarification |
| Merchant/Brand relationship | Unknown | Needs clarification |
| Mobile app integration | Expected/mentioned | Needs technical clarification |
| Accounting workflow | Partially known | Needs clarification |
| Pricing/charging model | Unclear | Needs clarification |

---

## 18. Important Note for the Next Discovery Session

Do **not** start designing the final database/entities or UI from this document yet.

First confirm:

1. **Users + roles + permissions**
2. **Merchant / Brand structure**
3. **Complete Order lifecycle**
4. **Branch workflow**
5. **Driver assignment and delivery workflow**
6. **Collection / COD / settlement workflow**
7. **System ↔ Mobile App integration**

Once these are confirmed, they can be converted into formal entities, workflows, permissions, and system requirements.
