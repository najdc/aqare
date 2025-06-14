import { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import ChartCard from '../components/dashboard/ChartCard';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'commission' | 'withdrawal';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  buyerId?: string;
  buyerName?: string;
  sellerId?: string;
  sellerName?: string;
  propertyId?: string;
  propertyTitle?: string;
  createdAt: string;
}

const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats for different roles
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    successRate: 0,
    pendingAmount: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      setLoading(true);
      try {
        let transactionsQuery;

        if (user.role === 'admin') {
          transactionsQuery = query(
            collection(db, 'transactions'),
            orderBy('createdAt', 'desc')
          );
        } else if (user.role === 'seller') {
          transactionsQuery = query(
            collection(db, 'transactions'),
            where('sellerId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
        } else {
          transactionsQuery = query(
            collection(db, 'transactions'),
            where('buyerId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
        }

        const snapshot = await getDocs(transactionsQuery);
        const transactionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];

        // Calculate stats
        const total = transactionsData.reduce((sum, tx) => sum + tx.amount, 0);
        const completed = transactionsData.filter(tx => tx.status === 'completed');
        const pending = transactionsData.filter(tx => tx.status === 'pending');
        const successRate = (completed.length / transactionsData.length) * 100;
        const pendingAmount = pending.reduce((sum, tx) => sum + tx.amount, 0);

        setStats({
          totalTransactions: transactionsData.length,
          totalAmount: total,
          successRate,
          pendingAmount,
        });

        setTransactions(transactionsData);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-800';
      case 'pending':
        return 'bg-warning-100 text-warning-800';
      case 'failed':
        return 'bg-error-100 text-error-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <ArrowUpRight className="h-5 w-5" />;
      case 'refund':
        return <ArrowDownLeft className="h-5 w-5" />;
      case 'commission':
        return <DollarSign className="h-5 w-5" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter !== 'all' && transaction.type !== filter) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.propertyTitle?.toLowerCase().includes(searchLower) ||
        transaction.buyerName?.toLowerCase().includes(searchLower) ||
        transaction.sellerName?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Example chart data
  const transactionData = [
    { name: 'Mon', amount: 5000 },
    { name: 'Tue', amount: 7500 },
    { name: 'Wed', amount: 6000 },
    { name: 'Thu', amount: 8000 },
    { name: 'Fri', amount: 9500 },
    { name: 'Sat', amount: 7000 },
    { name: 'Sun', amount: 6500 },
  ];

  return (
    <DashboardLayout title="Transactions">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Transactions"
            value={stats.totalTransactions.toString()}
            icon={<CreditCard className="h-6 w-6" />}
            color="primary"
          />
          <StatCard
            title="Total Amount"
            value={`${stats.totalAmount.toLocaleString()} SAR`}
            icon={<DollarSign className="h-6 w-6" />}
            color="success"
          />
          <StatCard
            title="Success Rate"
            value={`${stats.successRate.toFixed(1)}%`}
            icon={<TrendingUp className="h-6 w-6" />}
            trend={{ value: 5, isPositive: true }}
            color="accent"
          />
          <StatCard
            title="Pending Amount"
            value={`${stats.pendingAmount.toLocaleString()} SAR`}
            icon={<TrendingDown className="h-6 w-6" />}
            color="warning"
          />
        </div>

        {/* Transaction Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Transaction Volume"
            subtitle="Daily transaction volume"
            data={transactionData}
            type="area"
            dataKey="amount"
            xAxisDataKey="name"
            color="#047857"
          />
          <ChartCard
            title="Transaction Count"
            subtitle="Number of transactions"
            data={transactionData}
            type="bar"
            dataKey="amount"
            xAxisDataKey="name"
            color="#0369A1"
          />
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3 md:mb-0">Transaction History</h3>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>

              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Types</option>
                  <option value="payment">Payments</option>
                  <option value="refund">Refunds</option>
                  <option value="commission">Commissions</option>
                  <option value="withdrawal">Withdrawals</option>
                </select>
                <Filter className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as 'week' | 'month' | 'year')}
                  className="pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
                <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>

              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No transactions found</h3>
              <p className="mt-1 text-gray-500">
                {searchQuery ? 'Try adjusting your search or filters' : 'Transactions will appear here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    {user?.role === 'admin' && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Users
                      </th>
                    )}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-full mr-3 ${
                            transaction.type === 'payment' || transaction.type === 'commission'
                              ? 'bg-success-100 text-success-700'
                              : 'bg-warning-100 text-warning-700'
                          }`}>
                            {getTransactionTypeIcon(transaction.type)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 capitalize">
                              {transaction.type}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.description}
                            </div>
                            {transaction.propertyTitle && (
                              <div className="text-xs text-gray-400">
                                Property: {transaction.propertyTitle}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {user?.role === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {transaction.buyerName && (
                              <div>Buyer: {transaction.buyerName}</div>
                            )}
                            {transaction.sellerName && (
                              <div>Seller: {transaction.sellerName}</div>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          transaction.type === 'payment' || transaction.type === 'commission'
                            ? 'text-success-600'
                            : 'text-warning-600'
                        }`}>
                          {transaction.type === 'refund' ? '-' : '+'}
                          {transaction.amount.toLocaleString()} SAR
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;