import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlansView } from '@/components/plans/PlansView';

export function PlansPage() {
  const navigate = useNavigate();

  return (
    <PlansView
      onStartPlanWorkout={() => {
        navigate('/');
      }}
    />
  );
}
