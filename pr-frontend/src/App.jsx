import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Manufacturers from "./pages/Manufacturers"; // New Page
import Models from "./pages/model"; // New Page
import MainLayout from "./components/MainLayout"; 
import LogoutPage from "./pages/logout";
import ProtectedRoute from "./components/ProtectedRoute";
import QuotationPage from "./pages/QuotationPage";
import InventoryContainer from "./pages/InventoryContainer";
import PurchasePage from "./pages/PurchasePage";
import SalesPage from "./pages/SalesPage";
import SupplierPage from "./pages/SupplierPage";
import DemoTrackingPage from "./pages/DemoTrackingPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AuditLogPage from "./pages/AuditLogPage"



function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Protected Routes inside the Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* These "children" routes will render inside MainLayout's <Outlet /> */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="manufacturers" element={<Manufacturers />} />
          <Route path="models" element={<Models />} />
          <Route path="logout" element={<LogoutPage />} />
          <Route path="Quotation" element={<QuotationPage />} />
          <Route path="inventory" element={<InventoryContainer />} />
          <Route path="purchases" element={<PurchasePage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="/suppliers" element={<SupplierPage />} />
          <Route path="/demo-tracking" element={<DemoTrackingPage />} />

          <Route path="/AuditLogPage" element={<AuditLogPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;