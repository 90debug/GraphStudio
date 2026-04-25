/* 🎨 Design System Layer */

:root {
    /* 색상 */
    --ds-primary: #FF8C42;
    --ds-secondary: #FF8C42;
    --ds-accent: #10B981;
  
    --ds-text: #1E293B;
    --ds-text-2: #64748B;
  
    --ds-bg: #F8FAFC;
    --ds-white: #FFFFFF;
  
    --ds-border: #E2E8F0;
  
    /* radius */
    --ds-radius: 16px;
    --ds-radius-sm: 10px;
  
    /* shadow */
    --ds-shadow: 0 4px 12px rgba(0,0,0,0.08);
    --ds-shadow-hover: 0 6px 20px rgba(0,0,0,0.12);
  
    /* spacing */
    --ds-pad: 16px;
  }
  
  /* 📦 카드 */
  .ds-card {
    background: var(--ds-white);
    border-radius: var(--ds-radius);
    padding: var(--ds-pad);
    box-shadow: var(--ds-shadow);
    transition: 0.2s ease;
  }
  
  .ds-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--ds-shadow-hover);
  }
  
  /* 🔘 버튼 */
  .ds-button {
    height: 44px;
    padding: 0 16px;
    border-radius: 12px;
    font-weight: 700;
    background: var(--ds-primary);
    color: white;
    border: none;
    cursor: pointer;
    transition: 0.2s;
  }
  
  .ds-button:hover {
    filter: brightness(1.05);
  }
  
  /* 🏷️ 태그 */
  .ds-tag {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(255, 140, 66, 0.1);
    color: var(--ds-primary);
  }
  
  /* ✏️ 텍스트 */
  .ds-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--ds-text);
  }
  
  .ds-body {
    font-size: 13px;
    color: var(--ds-text-2);
  }
