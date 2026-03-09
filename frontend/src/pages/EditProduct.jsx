import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductForm from '../components/ProductForm';
import { getProductById, updateProduct } from '../services/api';
import { ChevronLeft } from 'lucide-react';

const EditProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProduct = async () => {
            try {
                const data = await getProductById(id);
                setProduct(data);
            } catch (err) {
                console.error(err);
                alert('Failed to load product');
            } finally {
                setLoading(false);
            }
        };
        loadProduct();
    }, [id]);

    const handleUpdate = async (formData) => {
        try {
            await updateProduct(id, formData);
            navigate('/products');
        } catch (err) {
            alert('Failed to update product');
        }
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/products')}
                    className="p-2 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-all text-gray-500"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
                    <p className="text-gray-500 mt-1">Update details for SKU: <span className="font-mono text-[#4F46E5]">{product?.sku}</span></p>
                </div>
            </div>

            <ProductForm
                initialData={product}
                onSubmit={handleUpdate}
            />
        </div>
    );
};

export default EditProduct;
