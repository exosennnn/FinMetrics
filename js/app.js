const { createApp, ref, computed, watch } = Vue;

createApp({
    setup() {
        // --- Theme Management ---
        const isDarkMode = ref(localStorage.getItem('nexus_dark_mode') !== 'false');

        const updateThemeClass = (dark) => {
            if (dark) {
                document.body.classList.remove('light-theme');
            } else {
                document.body.classList.add('light-theme');
            }
        };
        updateThemeClass(isDarkMode.value);

        watch(isDarkMode, (val) => {
            localStorage.setItem('nexus_dark_mode', val);
            updateThemeClass(val);
        });

        // --- Wallets State ---
        const wallets = ref([
            { id: 'cash', name: 'Cash', base: 2000 },
            { id: 'gcash', name: 'GCash', base: 3000 },
            { id: 'maya', name: 'Maya', base: 1000 },
            { id: 'bank', name: 'Bank', base: 10000 }
        ]);

        // --- Budget State ---
        const savedMonthlyBudget = localStorage.getItem('nexus_monthly_budget');
        const monthlyBudget = ref(savedMonthlyBudget !== null ? savedMonthlyBudget : "10000");

        watch(monthlyBudget, (val) => {
            localStorage.setItem('nexus_monthly_budget', val);
        });

        // --- Date & Month Selection ---
        const today = new Date().toISOString().split('T')[0];
        const currentMonthStr = today.slice(0, 7);
        const selectedMonth = ref(currentMonthStr);

        // --- Safe Storage Helper ---
        const loadFromStorage = (key, fallback) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : fallback;
            } catch (e) {
                console.error(`Error loading ${key} from localStorage:`, e);
                return fallback;
            }
        };

        // --- Transactions State ---
        const defaultTransactions = [
            { id: 1, text: 'Lunch', amount: -150, date: today, category: 'Food', wallet: 'cash' },
            { id: 2, text: 'Salary', amount: 5000, date: today, category: 'Salary', wallet: 'bank' }
        ];
        const transactions = ref(loadFromStorage('nexus_transactions', defaultTransactions));

        watch(transactions, (val) => {
            localStorage.setItem('nexus_transactions', JSON.stringify(val));
        }, { deep: true });

        // --- Savings Goals State ---
        const defaultGoals = [
            { id: 1, name: 'Emergency Fund', target: 15000, current: 3000 },
            { id: 2, name: 'New Headset', target: 2500, current: 1000 }
        ];
        const savingsGoals = ref(loadFromStorage('nexus_savings_goals', defaultGoals));

        watch(savingsGoals, (val) => {
            localStorage.setItem('nexus_savings_goals', JSON.stringify(val));
        }, { deep: true });

        // --- Filters & UI Modals ---
        const searchQuery = ref('');
        const filterCategory = ref('');
        const openGoalModal = ref(false);

        // --- Forms State ---
        const form = ref({ 
            text: '', 
            amount: '', 
            type: 'expense', 
            category: 'General',
            wallet: 'cash',
            date: today 
        });

        const newGoal = ref({ name: '', target: '' });

        // --- Actions & Helpers ---
        const toggleTheme = () => {
            isDarkMode.value = !isDarkMode.value;
        };

        const getWalletBalance = (walletId) => {
            const walletObj = wallets.value.find(w => w.id === walletId);
            const base = walletObj ? walletObj.base : 0;
            const txSum = transactions.value
                .filter(t => t.wallet === walletId)
                .reduce((acc, t) => acc + t.amount, 0);
            return base + txSum;
        };

        // --- Computed Properties ---
        const totalNetWorth = computed(() => {
            return wallets.value.reduce((acc, w) => acc + getWalletBalance(w.id), 0);
        });

        const monthTransactions = computed(() => {
            return transactions.value.filter(t => t.date && t.date.startsWith(selectedMonth.value));
        });

        // ETO ANG KINAKAILANGAN NG INDEX.HTML: totalMonthlyExpense
        const totalMonthlyExpense = computed(() => {
            const sum = monthTransactions.value
                .filter(t => t.amount < 0)
                .reduce((acc, t) => acc + t.amount, 0);
            return Math.abs(sum);
        });

        const budgetRemaining = computed(() => {
            const budget = parseFloat(monthlyBudget.value) || 0;
            return budget - totalMonthlyExpense.value;
        });

        const budgetPercentage = computed(() => {
            const budget = parseFloat(monthlyBudget.value) || 0;
            if (budget <= 0) return 0;
            return (totalMonthlyExpense.value / budget) * 100;
        });

        const categoryAnalytics = computed(() => {
            const expenses = monthTransactions.value.filter(t => t.amount < 0);
            const totalExp = totalMonthlyExpense.value;
            
            const catMap = {};
            expenses.forEach(t => {
                const cat = t.category || 'General';
                catMap[cat] = (catMap[cat] || 0) + Math.abs(t.amount);
            });

            return Object.keys(catMap).map(cat => {
                const amount = catMap[cat];
                const percentage = totalExp > 0 ? ((amount / totalExp) * 100).toFixed(0) : 0;
                return { name: cat, amount, percentage };
            }).sort((a, b) => b.amount - a.amount);
        });

        const filteredTransactions = computed(() => {
            const query = searchQuery.value.trim().toLowerCase();
            return monthTransactions.value.filter(t => {
                const matchesSearch = !query || t.text.toLowerCase().includes(query);
                const matchesCategory = !filterCategory.value || t.category === filterCategory.value;
                return matchesSearch && matchesCategory;
            });
        });

        // --- UI & Formatting Helpers ---
        const getWalletName = (id) => {
            const w = wallets.value.find(item => item.id === id);
            return w ? w.name : 'Cash';
        };

        const getWalletDotClass = (id) => {
            switch(id) {
                case 'cash': return 'bg-emerald-400';
                case 'gcash': return 'bg-sky-400';
                case 'maya': return 'bg-purple-400';
                case 'bank': return 'bg-amber-400';
                default: return 'bg-zinc-400';
            }
        };

        const getCategoryBadgeClass = (category) => {
            switch(category) {
                case 'Food': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                case 'Bills': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                case 'Transport': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
                case 'Shopping': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                case 'Salary': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                default: return 'bg-zinc-800 text-zinc-400 border-zinc-700/50';
            }
        };

        // --- Form Submission & Operations ---
        const onSubmit = () => {
            if (!form.value.text || !form.value.text.trim()) {
                alert('Mangyaring maglagay ng description.');
                return;
            }

            const rawAmount = parseFloat(form.value.amount);
            if (isNaN(rawAmount) || rawAmount <= 0) {
                alert('Maglagay ng wastong amount na mas mataas sa 0.');
                return;
            }

            const finalAmount = form.value.type === 'expense' ? -Math.abs(rawAmount) : Math.abs(rawAmount);

            transactions.value.unshift({
                id: Date.now(),
                text: form.value.text.trim(),
                amount: finalAmount,
                category: form.value.category || 'General',
                wallet: form.value.wallet || 'cash',
                date: form.value.date || today
            });

            form.value.text = '';
            form.value.amount = '';
            form.value.type = 'expense';
            form.value.category = 'General';
            form.value.wallet = 'cash';
            form.value.date = today;
        };

        const deleteTransaction = (id) => {
            transactions.value = transactions.value.filter(t => t.id !== id);
        };

        const clearHistory = () => {
            if (confirm(`Burahin ang lahat ng transaksiyon sa buwang ${selectedMonth.value}?`)) {
                transactions.value = transactions.value.filter(t => !t.date || !t.date.startsWith(selectedMonth.value));
            }
        };

        const saveGoal = () => {
            const target = parseFloat(newGoal.value.target);
            if (!newGoal.value.name || isNaN(target) || target <= 0) {
                alert('Punan ang pangalan at maglagay ng tamang target amount.');
                return;
            }
            savingsGoals.value.push({
                id: Date.now(),
                name: newGoal.value.name.trim(),
                target: target,
                current: 0
            });
            newGoal.value.name = '';
            newGoal.value.target = '';
            openGoalModal.value = false;
        };

        const contributeGoal = (id, amount) => {
            const goal = savingsGoals.value.find(g => g.id === id);
            if (goal) {
                goal.current += amount;
            }
        };

        const deleteGoal = (id) => {
            savingsGoals.value = savingsGoals.value.filter(g => g.id !== id);
        };

        // --- Backup & Restore ---
        const exportData = () => {
            const data = {
                monthlyBudget: monthlyBudget.value,
                wallets: wallets.value,
                transactions: transactions.value,
                savingsGoals: savingsGoals.value
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `finmetrics-backup-${today}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };

        const importData = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    if (parsed && Array.isArray(parsed.transactions)) {
                        if (parsed.monthlyBudget !== undefined) monthlyBudget.value = parsed.monthlyBudget;
                        if (parsed.wallets) wallets.value = parsed.wallets;
                        if (parsed.savingsGoals) savingsGoals.value = parsed.savingsGoals;
                        transactions.value = parsed.transactions;
                        alert('Matagumpay na na-import ang backup data!');
                    } else {
                        alert('Invalid backup format.');
                    }
                } catch (err) {
                    alert('Hindi mabasa ang JSON file.');
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        };

        return {
            isDarkMode,
            wallets,
            monthlyBudget,
            selectedMonth,
            transactions,
            savingsGoals,
            searchQuery,
            filterCategory,
            openGoalModal,
            form,
            newGoal,
            totalNetWorth,
            totalMonthlyExpense, // Inilagay na rito
            budgetRemaining,
            budgetPercentage,
            categoryAnalytics,
            filteredTransactions,
            toggleTheme,
            getWalletBalance,
            getWalletName,
            getWalletDotClass,
            getCategoryBadgeClass,
            onSubmit,
            deleteTransaction,
            clearHistory,
            saveGoal,
            contributeGoal,
            deleteGoal,
            exportData,
            importData
        };
    }
}).mount('#app');