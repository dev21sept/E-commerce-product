import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/ProductList';
import EbayImport from './pages/EbayImport';
import EditProduct from './pages/EditProduct';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AiFetching from './pages/AiFetching';

function App() {
    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/products" element={<ProductList />} />
                    <Route path="/ebay-import" element={<EbayImport />} />
                    <Route path="/products/edit/:id" element={<EditProduct />} />
                    <Route path="/ai-fetching" element={<AiFetching />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                </Routes>
            </Layout>
        </Router>
    );
}

export default App;
