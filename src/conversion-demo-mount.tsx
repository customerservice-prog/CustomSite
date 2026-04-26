import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/conversion-demo-island.css';
import { ConversionLeakRepairDemo } from '@/components/ConversionLeakRepairDemo';

const el = document.getElementById('conversionDemoRoot');
if (el) {
  createRoot(el).render(
    <StrictMode>
      <ConversionLeakRepairDemo />
    </StrictMode>
  );
}
