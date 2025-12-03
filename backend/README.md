# 🛒 E-Commerce Backend (NestJS)

A modular, scalable, and production-ready **E-commerce Backend API** built using **NestJS**, following clean architecture, DTO validation, and role-based access control. This project demonstrates real-world backend engineering skills suitable for internships, final-year projects, and portfolio presentation.

---

## 📌 **Project Overview**

This backend powers a complete e-commerce system, supporting:

* User authentication & authorization
* Product management
* Shopping cart functionality
* Order placement & tracking
* Admin & Super Admin roles
* Email/Mailer support

Built with NestJS and a service-driven architecture, the project follows industry standards for scalability, maintainability, and readability.

---

## 🚀 **Tech Stack**

* **NestJS** (Backend Framework)
* **TypeORM** (Database ORM)
* **PostgreSQL / MySQL** (Database)
* **JWT Authentication**
* **BCrypt** (Password hashing)
* **Mailer Module** (Email services)
* **Class-Validator & DTOs**

---

## ✨ **Core Features**

### 🔐 Authentication & Authorization

* User Registration & Login
* JWT-based authentication
* Role-based Access Control (User, Admin, Super Admin)

### 👤 User Module

* Update profile
* View profile
* Secure user data handling

### 🛍️ Product Module

* Add/Edit/Delete products (Admin)
* View product list
* Get product by ID

### 🛒 Cart Module

* Add items to cart
* Remove items
* Update quantities
* Fetch user cart

### 📦 Order Module

* Place an order
* Track orders
* User order history
* Admin order management

### 👑 Super Admin Module

* Manage admin users
* Full system-level access

### ✉️ Mailer Module

* Email notifications (order confirmation, admin actions)

---

## 📁 Folder Structure

```
src/
 ├── auth/
 ├── user/
 ├── admin/
 ├── super-admin/
 ├── products/
 ├── cart/
 ├── orders/
 ├── mailer/
 ├── app.module.ts
 └── main.ts
```

---

## 📡 API Endpoints (Overview)

### **Auth**

* POST `/auth/register`
* POST `/auth/login`

### **User**

* GET `/user/me`
* PUT `/user/update`

### **Products**

* GET `/products`
* GET `/products/:id`
* POST `/products` (Admin)
* PATCH `/products/:id` (Admin)
* DELETE `/products/:id` (Admin)

### **Cart**

* POST `/cart/add`
* GET `/cart`
* DELETE `/cart/remove/:id`

### **Orders**

* POST `/orders`
* GET `/orders/user`
* GET `/orders/all` (Admin)

---

## 🔧 Installation & Setup

### 1️⃣ Clone the Repository

```
git clone <repository-url>
cd ecommerce-backend
```

### 2️⃣ Install Dependencies

```
npm install
```

### 3️⃣ Configure Environment Variables

Create a `.env` file:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_user
DB_PASS=your_password
DB_NAME=ecommerce
JWT_SECRET=your_secret_key
MAIL_HOST=your_mail_host
MAIL_USER=your_mail_user
MAIL_PASS=your_mail_pass
```

### 4️⃣ Run the Project

```
npm run start:dev
```

---

## 📈 Future Improvements

* Add payment integration (Stripe / SSLCommerz)
* Add Swagger API Documentation
* Add product pagination
* Improve logging & global exception filter
* Add unit & e2e tests

---

## 🤝 Contribution

Pull requests are welcome! For major changes, please open an issue first.

---

## 📫 Contact

**Developer:** Mashudh Ahmed

Feel free to reach out for collaboration or internship opportunities.

---

### ⭐ If you like this project, consider starring the repository!
