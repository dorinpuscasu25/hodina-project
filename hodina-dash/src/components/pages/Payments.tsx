import React, { useState } from 'react';
import { Search, X, Wallet, DollarSign, ShoppingCart } from 'lucide-react';

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotification, setShowNotification] = useState(true);

  const transactions = [
    {
      id: 1,
      name: 'Swarna Apartment',
      orderId: '#PC01362',
      date: 'Dec 10, 2025',
      amount: '$200 USD',
      fee: '$17.10 USD'
    },
    {
      id: 2,
      name: 'Blue Cafe',
      orderId: '#PC01363',
      date: 'Jan 12, 2025',
      amount: '$150 USD',
      fee: '$12.30 USD'
    },
    {
      id: 3,
      name: 'Kanoop Barbar Shop',
      orderId: '#PC01364',
      date: 'Sep 22, 2023',
      amount: '$75.50 USD',
      fee: '$10.20 USD'
    },
    {
      id: 4,
      name: 'Classic Casino',
      orderId: '#PC01365',
      date: 'Dec 16, 2024',
      amount: '$652 USD',
      fee: '$80.90 USD'
    }
  ];

  const stats = [
    {
      icon: <Wallet className="h-8 w-8 text-white" />,
      value: '510',
      label: 'Your Balance in USD',
      bgColor: 'bg-red-500'
    },
    {
      icon: <DollarSign className="h-8 w-8 text-white" />,
      value: '720',
      label: 'Total Earning in USD',
      bgColor: 'bg-yellow-500'
    },
    {
      icon: <ShoppingCart className="h-8 w-8 text-white" />,
      value: '7',
      label: 'Total Orders',
      bgColor: 'bg-purple-500'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Wallet</h1>
      </div>

      {/* Notification */}
      {showNotification && (
        <div className="mb-8 bg-green-100 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
          <p className="text-green-800">
            Your last payout <span className="font-semibold">$450 USD</span> has been withdrawal.
          </p>
          <button
            onClick={() => setShowNotification(false)}
            className="text-green-600 hover:text-green-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center space-x-4">
              <div className={`${stat.bgColor} rounded-2xl p-4 flex-shrink-0`}>
                {stat.icon}
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">
                  {stat.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Earnings Section */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Section Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Your Earning</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search any parameter"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002626] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-5 gap-4 p-6 bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-600">
          <div>Name</div>
          <div>Order ID</div>
          <div>Date</div>
          <div>Amount</div>
          <div>Fee</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-gray-100">
          {transactions
            .filter(transaction => 
              transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              transaction.orderId.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((transaction) => (
              <div key={transaction.id} className="grid grid-cols-5 gap-4 p-6 hover:bg-gray-50 transition-colors">
                <div className="font-medium text-gray-900">{transaction.name}</div>
                <div className="text-gray-600">{transaction.orderId}</div>
                <div className="text-gray-600">{transaction.date}</div>
                <div className="font-medium text-gray-900">{transaction.amount}</div>
                <div className="text-red-600 font-medium">{transaction.fee}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          © 2025 ListingHub. Develop with ❤️ By Shreethemes
        </p>
      </div>
    </div>
  );
}