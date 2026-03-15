import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '../components/Button';

export default function AccessDenied() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8 text-red-600" />
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-600 mb-6 max-w-md">
        You do not have permission to view this page.
      </p>
      <Link to="/">
        <Button>Go to Dashboard</Button>
      </Link>
    </div>
  );
}
