import React, { useState, useEffect } from 'react';
import { SubscriptionPlan, User } from '../types';
import { subscriptionService } from '../services/api';

interface Props {
    currentUser: User;
    onPlanRequested: () => void;
}

const SubscriptionSelection: React.FC<Props> = ({ currentUser, onPlanRequested }) => {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await subscriptionService.getPlans();
                setPlans(res.data);
            } catch (err) {
                console.error("Failed to fetch plans", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    const handleSelectPlan = async (planId: string) => {
        setRequesting(planId);
        try {
            await subscriptionService.requestSubscription(planId);
            alert("Subscription request submitted! An admin will review and approve it shortly.");
            onPlanRequested();
        } catch (err: any) {
            console.error("Subscription request failed:", err);
            const msg = err.response?.data?.message || "Failed to submit request. Please try again.";
            alert(msg);
        } finally {
            setRequesting(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-12 px-4">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight uppercase">Choose Your Plan</h1>
                <p className="text-slate-500 max-w-2xl mx-auto font-medium">
                    Get started with Setu Business Suite. Select a plan that fits your business needs.
                    Your request will be sent to our admin team for approval.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:border-blue-500 transition-all flex flex-col relative overflow-hidden group">
                        {plan.name === 'Standard' && (
                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-bl-2xl">
                                Most Popular
                            </div>
                        )}

                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">{plan.name}</h3>
                            <p className="text-slate-500 text-sm font-medium">{plan.description}</p>
                        </div>

                        <div className="mb-8">
                            <span className="text-4xl font-black text-slate-900">${plan.price}</span>
                            <span className="text-slate-400 text-sm font-bold uppercase tracking-widest ml-2">/ {plan.validity}</span>
                        </div>

                        <div className="space-y-4 mb-10 flex-1">
                            {JSON.parse(plan.featuresJson || '[]').map((feature: string, idx: number) => (
                                <div key={idx} className="flex items-center text-sm text-slate-600 font-medium">
                                    <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mr-3 flex-shrink-0">
                                        <i className="fas fa-check text-[10px]"></i>
                                    </div>
                                    {feature}
                                </div>
                            ))}
                            <div className="flex items-center text-sm text-slate-600 font-medium pt-4 border-t border-slate-50">
                                <i className="fas fa-building w-5 text-slate-400 mr-2"></i> Up to {plan.maxCompanies} Companies
                            </div>
                            <div className="flex items-center text-sm text-slate-600 font-medium">
                                <i className="fas fa-box w-5 text-slate-400 mr-2"></i> Up to {plan.maxProducts} Products
                            </div>
                            <div className="flex items-center text-sm text-slate-600 font-medium">
                                <i className="fas fa-users w-5 text-slate-400 mr-2"></i> Up to {plan.maxUsers} Users
                            </div>
                        </div>

                        <button
                            onClick={() => handleSelectPlan(plan.id)}
                            disabled={requesting !== null}
                            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-lg ${requesting === plan.id
                                ? 'bg-slate-100 text-slate-400'
                                : 'bg-slate-900 text-white hover:bg-blue-600 shadow-slate-200'
                                }`}
                        >
                            {requesting === plan.id ? 'Processing...' : 'Select Plan'}
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-16 bg-blue-50 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between border border-blue-100">
                <div>
                    <h4 className="text-xl font-black text-blue-900 uppercase tracking-tight mb-2">Need a custom plan?</h4>
                    <p className="text-blue-700 font-medium text-sm">Contact our sales team for personalized enterprise solutions.</p>
                </div>
                <button className="mt-6 md:mt-0 px-8 py-4 bg-white text-blue-600 font-black text-sm uppercase tracking-widest rounded-2xl shadow-sm border border-blue-200 hover:bg-blue-600 hover:text-white transition-all">
                    Contact Sales
                </button>
            </div>
        </div>
    );
};

export default SubscriptionSelection;
