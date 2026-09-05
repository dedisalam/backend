# BDD Scenarios untuk Unit Test Backend (UU-48)

Berkas ini memuat skenario pengujian unit (Unit Tests) berbasis perilaku (BDD - Given/When/Then) untuk aplikasi Backend (API Gateway, User Service, Notification Service) dengan penekanan pada skenario kegagalan (Negative Tests) dan isolasi murni tanpa basis data sungguhan.

## 1. API Gateway (`app.controller.spec.ts`)
Komponen ini bertanggung jawab merutekan permintaan HTTP ke Microservices.

### Skenario 1.1: Mendapatkan Sapaan Sukses (Happy Path)
**Given** microservices berjalan dengan baik.
**When** klien memanggil endpoint `GET /api/v1/hello`.
**Then** layanan mengembalikan payload dengan `message: 'Hello World!'` dan status konektivitas TCP yang sukses dari User Service.

### Skenario 1.2: User Service Offline (Negative Test)
**Given** User Service tidak dapat dihubungi via TCP (timeout/error).
**When** klien memanggil endpoint `GET /api/v1/hello`.
**Then** sistem melempar error `HttpException` (atau mengembalikan pesan error gracefully).

## 2. User Service (`app.controller.spec.ts`)
Komponen ini melayani Request TCP dari Gateway.

### Skenario 2.1: Mengembalikan Payload Sukses (Happy Path)
**Given** User Service menerima permintaan konektivitas ping.
**When** koneksi TCP terjalin dan `getHello` dipanggil.
**Then** layanan mengembalikan balasan `{ message: 'Hello from User Service (TCP)' }`.

### Skenario 2.2: Payload Sapaan Invalid (Negative Test)
**Given** payload/request yang dikirim ke `getHello` tidak valid (misal salah pola pattern).
**When** koneksi TCP memanggil dengan pola yang salah.
**Then** aplikasi mengembalikan error yang tertangkap di level transport. (Ini biasanya dikelola oleh nestjs, namun kita bisa membuat tes khusus jika ada validasi payload).

## 3. Notification Service (`app.controller.spec.ts` & `notification.gateway.spec.ts`)
Komponen ini melayani event dari RabbitMQ dan memancarkannya ke Socket.IO.

### Skenario 3.1: Menerima Event Sukses (Happy Path)
**Given** event `test.hello` diterima dari RabbitMQ.
**When** fungsi `handleHelloEvent` dijalankan.
**Then** logger mencatat event, dan `NotificationGateway` memancarkan (emit) pesan Socket.IO `hello`.

### Skenario 3.2: Payload Event Malformasi (Negative Test)
**Given** event `test.hello` datang dengan tipe payload yang salah / kosong (null).
**When** fungsi `handleHelloEvent` mencoba memproses.
**Then** fungsi menangani dengan `try-catch` / logging dan tidak menyebabkan crash pada service.
