# Wholesale Admin: Complete Application Overview

The **Wholesale Admin** application is a modern, AI-powered mobile solution designed to streamline wholesale business operations. Built with a focus on speed, efficiency, and intelligence, it transforms traditional data entry into a context-aware, voice-driven experience.

---

## 🏛 Core Functionality

The application revolves around three primary pillars: **Clients (Stores)**, **Products (Materials)**, and **Transactions (Orders)**.

### 1. Client & Store Management
*   **Detailed Directory**: Manage a comprehensive list of wholesale clients (referred to as "Stores"). Each store profile includes contact information, geographical area, and financial status.
*   **Debt Tracking**: Automated tracking of outstanding balances ("Total Debt") for each store based on order status.
*   **Customized Pricing**: Set specific margin percentages and extra charges per store to automate price calculations during order creation.
*   **Area-Based Organization**: Quickly filter and manage stores based on their physical location or delivery route.

### 2. Product & Material Catalog
*   **Centralized Inventory**: Standardize the catalog of products (Materials) with unit definitions (e.g., kg, pcs, box) and base prices.
*   **Dynamic Pricing Engine**: Unit prices are calculated in real-time by combining the product's base price with the store's specific margin, ensuring consistent and accurate billing.

### 3. Order Lifecycle & Management
*   **Streamlined Creation**: Create complex multi-item orders in seconds.
*   **Status Tracking**: Monitor order status through its lifecycle:
    *   `New`: Order placed but not yet acknowledged or processed.
    *   `Unpaid`: Order delivered/processed but payment is pending.
    *   `Paid`: Transaction completed.
*   **Financial Integrity**: Orders automatically update the store's total debt and generate a financial history for ledger tracking.

---

## 🎙 AI Voice-Driven Interface

The standout feature of Wholesale Admin is its **GenAI integration**, powered by **Google Gemini**.

*   **Natural Language Processing**: Users can perform complex operations using simple speech (e.g., *"Add 10kg apples for Raj Store"*).
*   **Multi-Model Intelligence**: The app intelligently cycles through Gemini models (2.0 Flash, Flash Latest, Pro) to ensure the fastest and most accurate parsing.
*   **Context-Aware Resolution**: The AI doesn't just parse text; it understands your business context. It matches spoken names to existing client and product IDs in your database automatically.
*   **Hinglish Support**: Optimized for bilingual communication, recognizing common regional terms (e.g., *"aur"* for "and", *"tel"* for "oil").

---

## 👤 User Roles & Security

The app implements a firm-based multi-tenant architecture:

*   **Business Owners**:
    *   Full control over the business ("Firm").
    *   Manage products, pricing, and all client records.
    *   Unique **Firm Code** system (based on UUID prefix) to onboard staff.
*   **Salesmen**:
    *   Assigned to a specific Business Owner.
    *   Authorized to create orders and update client records within the owner's domain.
    *   Limited access to broad business configurations or sensitive owner-level data.

---

## 🛠 Technical Architecture

*   **Framework**: **Expo (React Native)** for a high-performance cross-platform mobile experience.
*   **Navigation**: **Expo Router** using a file-based, intuitive routing system.
*   **Backend**: **Supabase** (PostgreSQL) providing:
    *   **Secure Auth**: Profile-synced authentication.
    *   **Real-time Data**: Instant updates across devices.
    *   **Row-Level Security (RLS)**: Strict data isolation between different firms.
*   **Offline-First Strategy**: Designed to work reliably in low-connectivity environments, syncing data back to Supabase once a connection is restored.
*   **Rich UI/UX**: Built with vanilla styling and **Reanimated** for smooth, professional-grade animations and transitions.
