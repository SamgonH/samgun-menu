// 1. Supabase 연동 설정
const SUPABASE_URL = "https://nflgvgekvlihbciwiluz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mbGd2Z2VrdmxpaGJjaXdpbHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3OTI3NDksImV4cCI6MjEwMTM2ODc0OX0.Dv51jnRlvJeh7ZHlikdBaidaGeU6wRIxwMTBNrUU79g";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const categoryIcons = {
  '국&찌개': '🍲',
  '볶음&조림': '🍳',
  '밥류': '🍚',
  '면류': '🍜',
  '기타': '🍴'
};

// 🌟 타임존 영향 없는 100% 순수 YYYY-MM-DD 문자열 생성 함수
function formatDateStr(y, m, d) {
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

// 오늘 날짜 문자열 (로컬 기준)
function getTodayStr() {
  const now = new Date();
  return formatDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

// 상태 변수
let currentDate = new Date();
let selectedDateStr = null;
let currentTab = 'menu';
let menuMode = 'weekly';

// 식사 입력 상태
let selectedMealType = 'home';
let selectedMealIcon = '🍲';
let pickerSelectedCat = '국&찌개';

// 레시피 상태
let currentRecipeCategory = '국&찌개';
let currentCategoryRecipes = []; 
let currentRecipeIndex = 0;       
let editingRecipeId = null;
let selectedDifficulty = 1;

let calModalDate = new Date();

// DOM
const weeklyView = document.getElementById('weekly-view');
const monthlyView = document.getElementById('monthly-view');
const recipeView = document.getElementById('recipe-view');
const shoppingView = document.getElementById('shopping-view');
const subToggle = document.getElementById('sub-toggle');

const tabMenu = document.getElementById('tab-menu');
const tabRecipe = document.getElementById('tab-recipe');
const tabShopping = document.getElementById('tab-shopping');
const btnWeekly = document.getElementById('btn-weekly');
const btnMonthly = document.getElementById('btn-monthly');

function getWeekInfo(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const firstDayOfMonth = new Date(year, date.getMonth(), 1);
  const firstDayWeekday = firstDayOfMonth.getDay() === 0 ? 7 : firstDayOfMonth.getDay();
  const weekNum = Math.ceil((date.getDate() + firstDayWeekday - 1) / 7);
  return { year, month, weekNum };
}

// 월요일 기준 날짜 계산 (타임존 방지 정수 계산)
function getMonday(d) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const dateNum = d.getDate();
  const day = d.getDay();
  const diff = dateNum - (day === 0 ? 6 : day - 1);
  return new Date(y, m, diff);
}

tabMenu.addEventListener('click', () => switchMainTab('menu'));
tabRecipe.addEventListener('click', () => switchMainTab('recipe'));
tabShopping.addEventListener('click', () => switchMainTab('shopping'));

function switchMainTab(tab) {
  currentTab = tab;
  [tabMenu, tabRecipe, tabShopping].forEach(t => t.classList.remove('active'));
  [weeklyView, monthlyView, recipeView, shoppingView].forEach(v => v.classList.add('hidden'));

  if (tab === 'menu') {
    tabMenu.classList.add('active');
    subToggle.classList.remove('hidden');
    switchMenuMode(menuMode);
  } else if (tab === 'recipe') {
    tabRecipe.classList.add('active');
    subToggle.classList.add('hidden');
    recipeView.classList.remove('hidden');
    loadRecipes();
  } else if (tab === 'shopping') {
    tabShopping.classList.add('active');
    subToggle.classList.add('hidden');
    shoppingView.classList.remove('hidden');
    loadShoppingList();
  }
}

btnWeekly.addEventListener('click', () => switchMenuMode('weekly'));
btnMonthly.addEventListener('click', () => switchMenuMode('monthly'));

function switchMenuMode(mode) {
  menuMode = mode;
  [recipeView, shoppingView].forEach(v => v.classList.add('hidden'));

  if (mode === 'weekly') {
    btnWeekly.classList.add('active');
    btnMonthly.classList.remove('active');
    weeklyView.classList.remove('hidden');
    monthlyView.classList.add('hidden');
    renderWeeklyView();
  } else {
    btnMonthly.classList.add('active');
    btnWeekly.classList.remove('active');
    monthlyView.classList.remove('hidden');
    weeklyView.classList.add('hidden');
    renderMonthlyView();
  }
}

// === 커스텀 달력 모달 ===
document.getElementById('weekly-picker-trigger').addEventListener('click', () => openCustomCalModal());
document.getElementById('monthly-picker-trigger').addEventListener('click', () => openCustomCalModal());
document.getElementById('shop-picker-trigger').addEventListener('click', () => openCustomCalModal());

document.getElementById('btn-close-cal-modal').addEventListener('click', () => {
  document.getElementById('custom-calendar-modal').classList.add('hidden');
});

document.getElementById('cal-prev-btn').addEventListener('click', () => {
  calModalDate.setMonth(calModalDate.getMonth() - 1);
  renderCustomCalGrid();
});
document.getElementById('cal-next-btn').addEventListener('click', () => {
  calModalDate.setMonth(calModalDate.getMonth() + 1);
  renderCustomCalGrid();
});

function openCustomCalModal() {
  calModalDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  renderCustomCalGrid();
  document.getElementById('custom-calendar-modal').classList.remove('hidden');
}

function renderCustomCalGrid() {
  const year = calModalDate.getFullYear();
  const month = calModalDate.getMonth();
  document.getElementById('cal-month-title').innerText = `${year}년 ${month + 1}월`;

  const grid = document.getElementById('custom-cal-grid');
  grid.innerHTML = '';

  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();

  const selMonday = getMonday(currentDate);
  const selWeekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(selMonday.getFullYear(), selMonday.getMonth(), selMonday.getDate() + i);
    selWeekDates.push(formatDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  }

  for (let x = firstDayIndex; x > 0; x--) {
    const dayNum = prevLastDate - x + 1;
    const d = new Date(year, month - 1, dayNum);
    createCalCell(grid, dayNum, formatDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate()), true, selWeekDates);
  }

  for (let i = 1; i <= lastDate; i++) {
    const d = new Date(year, month, i);
    createCalCell(grid, i, formatDateStr(year, month + 1, i), false, selWeekDates);
  }

  const totalCells = firstDayIndex + lastDate;
  const nextDays = (42 - totalCells) % 7;
  for (let j = 1; j <= nextDays; j++) {
    const d = new Date(year, month + 1, j);
    createCalCell(grid, j, formatDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate()), true, selWeekDates);
  }
}

function createCalCell(container, dayNum, dateStr, isOtherMonth, selWeekDates) {
  const cell = document.createElement('div');
  const inWeek = selWeekDates.includes(dateStr);
  const targetTodayStr = formatDateStr(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
  const isTargetDay = dateStr === targetTodayStr;

  cell.className = `cal-day-cell ${isOtherMonth ? 'other-month' : ''} ${inWeek && (menuMode === 'weekly' || currentTab === 'shopping') ? 'in-selected-week' : ''} ${isTargetDay ? 'selected-day' : ''}`;
  cell.innerText = dayNum;

  cell.onclick = () => {
    const parts = dateStr.split('-');
    currentDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    document.getElementById('custom-calendar-modal').classList.add('hidden');
    if (currentTab === 'shopping') loadShoppingList();
    else if (menuMode === 'weekly') renderWeeklyView();
    else renderMonthlyView();
  };

  container.appendChild(cell);
}

// === 🍱 주간 캘린더 (날짜 문자열 직접 매핑) ===
document.getElementById('prev-week').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() - 7);
  renderWeeklyView();
});
document.getElementById('next-week').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() + 7);
  renderWeeklyView();
});

async function renderWeeklyView() {
  const weeklyList = document.getElementById('weekly-list');
  weeklyList.innerHTML = '<div class="loading-box">🍲 주간 메뉴를 불러오는 중...</div>';

  const monday = getMonday(currentDate);
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    weekDates.push(formatDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  }

  const info = getWeekInfo(monday);
  const startStr = weekDates[0].slice(5).replace('-', '.');
  const endStr = weekDates[6].slice(5).replace('-', '.');
  
  document.getElementById('week-title').innerText = `${info.year}년 ${info.month}월 ${info.weekNum}주차`;
  document.getElementById('week-range').innerText = `(${startStr} ~ ${endStr})`;

  const { data: meals } = await db.from('meals').select('*').in('date', weekDates);
  const mealsMap = {};
  (meals || []).forEach(m => mealsMap[m.date] = m);

  weeklyList.innerHTML = '';
  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
  const todayStr = getTodayStr();

  // 월요일부터 일요일까지 1:1 정밀 매핑
  weekDates.forEach((dateStr, idx) => {
    const meal = mealsMap[dateStr];
    const isToday = dateStr === todayStr;
    const card = document.createElement('div');
    
    const mealTypeClass = meal?.meal_type ? `meal-${meal.meal_type}` : '';
    card.className = `day-card ${isToday ? 'today' : ''} ${mealTypeClass}`;

    let displayMenu = '메뉴를 등록해 보세요';
    if (meal?.meal_type === 'alone') {
      displayMenu = `😭 따로먹음${meal.reason ? ` (${meal.reason})` : ''}`;
    } else if (meal?.menu_name) {
      const icon = meal.icon || '🍲';
      displayMenu = `${icon} ${meal.menu_name}`;
    }

    const dayInfo = document.createElement('div');
    dayInfo.className = 'day-info';
    dayInfo.innerHTML = `
      <span class="day-name">${dateStr.slice(5)} (${dayNames[idx]})</span>
      <span class="menu-text ${(!meal?.menu_name && meal?.meal_type !== 'alone') ? 'empty' : ''}">
        ${displayMenu}
      </span>
    `;
    dayInfo.onclick = () => handleMealClick(dateStr, meal);

    card.appendChild(dayInfo);
    weeklyList.appendChild(card);
  });
}

// 🌟 요일 클릭 핸들러: 메뉴가 이미 있으면 액션 팝업, 없으면 바로 등록 모달
let currentActionMeal = null;
let currentActionDateStr = null;
let currentMatchedRecipe = null;

async function handleMealClick(dateStr, meal) {
  const hasMenu = meal && (meal.menu_name || meal.meal_type === 'alone');
  if (!hasMenu) {
    openMealModal(dateStr, '', '🍲', 'home', '');
  } else {
    await openMealActionModal(dateStr, meal);
  }
}

// 🌟 레시피 확인 / 수정 선택 팝업
async function openMealActionModal(dateStr, meal) {
  currentActionDateStr = dateStr;
  currentActionMeal = meal;
  currentMatchedRecipe = null;

  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[d.getDay()];

  document.getElementById('meal-action-date-title').innerText = `${parts[1]}월 ${parts[2]}일 (${dayName}) 메뉴`;

  let menuDisplay = '';
  if (meal.meal_type === 'alone') {
    menuDisplay = `😭 따로먹음${meal.reason ? ` (${meal.reason})` : ''}`;
  } else {
    menuDisplay = `${meal.icon || '🍲'} ${meal.menu_name}`;
  }
  document.getElementById('meal-action-menu-name').innerText = menuDisplay;

  const viewRecipeBtn = document.getElementById('btn-action-view-recipe');

  // 레시피 검색 (집밥 메뉴이고 메뉴명이 있을 때만 매칭)
  if (meal.menu_name && meal.meal_type !== 'alone') {
    const trimmed = meal.menu_name.trim();
    const { data: recipes } = await db.from('recipes')
      .select('*')
      .ilike('title', trimmed)
      .limit(1);

    if (recipes && recipes.length > 0) {
      currentMatchedRecipe = recipes[0];
    }
  }

  if (currentMatchedRecipe) {
    viewRecipeBtn.disabled = false;
    viewRecipeBtn.title = `'${currentMatchedRecipe.title}' 레시피 보기`;
  } else {
    viewRecipeBtn.disabled = true;
    viewRecipeBtn.title = '등록된 레시피가 없습니다.';
  }

  document.getElementById('meal-action-modal').classList.remove('hidden');
}

// 액션 모달 이벤트 리스너
document.getElementById('btn-action-view-recipe').addEventListener('click', async () => {
  if (!currentMatchedRecipe) return;

  document.getElementById('meal-action-modal').classList.add('hidden');
  await navigateToRecipe(currentMatchedRecipe);
});

document.getElementById('btn-action-edit-meal').addEventListener('click', () => {
  document.getElementById('meal-action-modal').classList.add('hidden');
  if (currentActionMeal) {
    openMealModal(
      currentActionDateStr,
      currentActionMeal.menu_name || '',
      currentActionMeal.icon || '🍲',
      currentActionMeal.meal_type || 'home',
      currentActionMeal.reason || ''
    );
  } else {
    openMealModal(currentActionDateStr, '', '🍲', 'home', '');
  }
});

document.getElementById('btn-close-action-modal').addEventListener('click', () => {
  document.getElementById('meal-action-modal').classList.add('hidden');
});

// 특정 레시피 상세 화면으로 직행하는 함수
async function navigateToRecipe(recipe) {
  switchMainTab('recipe');
  currentRecipeCategory = recipe.category || '국&찌개';

  document.querySelectorAll('.bookmark-tab').forEach(t => {
    if (t.getAttribute('data-cat') === currentRecipeCategory) t.classList.add('active');
    else t.classList.remove('active');
  });

  await loadRecipes();

  const foundIdx = currentCategoryRecipes.findIndex(r => r.id === recipe.id);
  if (foundIdx !== -1) {
    openRecipeDetail(foundIdx);
  }
}

// 식사 입력 모달
async function openMealModal(dateStr, currentMenu, currentIcon, currentType, currentReason) {
  selectedDateStr = dateStr;
  document.getElementById('modal-date-title').innerText = `${dateStr} 저녁메뉴`;
  document.getElementById('meal-input').value = currentMenu || '';
  document.getElementById('meal-reason-input').value = currentReason || '';

  selectedMealType = currentType || 'home';
  selectedMealIcon = currentIcon || '🍲';

  updateMealTypeUI();

  const deleteBtn = document.getElementById('btn-delete-meal');
  if (currentMenu || currentType === 'alone') {
    deleteBtn.classList.remove('hidden');
  } else {
    deleteBtn.classList.add('hidden');
  }

  document.getElementById('meal-modal').classList.remove('hidden');
}

document.getElementById('btn-delete-meal').addEventListener('click', async () => {
  if (!selectedDateStr) return;

  await db.from('meals').delete().eq('date', selectedDateStr);
  document.getElementById('meal-modal').classList.add('hidden');

  if (menuMode === 'weekly') renderWeeklyView();
  else renderMonthlyView();
});

document.querySelectorAll('.meal-type-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    selectedMealType = e.target.getAttribute('data-type');
    if (selectedMealType === 'delivery') selectedMealIcon = '🛵';
    else if (selectedMealType === 'out') selectedMealIcon = '🍽️';
    else if (selectedMealType === 'alone') selectedMealIcon = '😭';
    else selectedMealIcon = '🍲';

    updateMealTypeUI();
  });
});

document.querySelectorAll('.icon-opt').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.icon-opt').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    selectedMealIcon = e.target.getAttribute('data-icon');
  });
});

function updateMealTypeUI() {
  document.querySelectorAll('.meal-type-btn').forEach(b => {
    if (b.getAttribute('data-type') === selectedMealType) b.classList.add('active');
    else b.classList.remove('active');
  });

  const iconGroup = document.getElementById('icon-select-group');
  const recipeBox = document.getElementById('recipe-select-box');
  const mealInputGroup = document.getElementById('meal-input-group');
  const reasonInputGroup = document.getElementById('reason-input-group');

  if (selectedMealType === 'home') {
    iconGroup.classList.remove('hidden');
    recipeBox.classList.remove('hidden');
    mealInputGroup.classList.remove('hidden');
    reasonInputGroup.classList.add('hidden');

    document.querySelectorAll('.icon-opt').forEach(b => {
      if (b.getAttribute('data-icon') === selectedMealIcon) b.classList.add('active');
      else b.classList.remove('active');
    });
  } else if (selectedMealType === 'alone') {
    iconGroup.classList.add('hidden');
    recipeBox.classList.add('hidden');
    mealInputGroup.classList.add('hidden');
    reasonInputGroup.classList.remove('hidden');
  } else {
    iconGroup.classList.add('hidden');
    recipeBox.classList.add('hidden');
    mealInputGroup.classList.remove('hidden');
    reasonInputGroup.classList.add('hidden');
  }
}

// 레시피 선택 서브 팝업
document.getElementById('btn-open-recipe-picker').addEventListener('click', () => {
  pickerSelectedCat = '국&찌개';
  updateRecipePickerUI();
  document.getElementById('recipe-picker-modal').classList.remove('hidden');
});

document.getElementById('btn-close-recipe-picker').addEventListener('click', () => {
  document.getElementById('recipe-picker-modal').classList.add('hidden');
});

document.querySelectorAll('.picker-cat-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    pickerSelectedCat = e.target.getAttribute('data-cat');
    updateRecipePickerUI();
  });
});

async function updateRecipePickerUI() {
  document.querySelectorAll('.picker-cat-btn').forEach(b => {
    if (b.getAttribute('data-cat') === pickerSelectedCat) b.classList.add('active');
    else b.classList.remove('active');
  });

  document.getElementById('picker-cat-title').innerText = `[${pickerSelectedCat}] 레시피 목록`;

  const { data: recipes } = await db.from('recipes')
    .select('*')
    .eq('category', pickerSelectedCat)
    .order('sort_order', { ascending: true });

  const listContainer = document.getElementById('picker-recipe-list');
  listContainer.innerHTML = '';

  if (!recipes || recipes.length === 0) {
    listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#a09588; font-size:0.95rem;">이 카테고리엔 레시피가 없어요!</div>`;
    return;
  }

  recipes.forEach(r => {
    const icon = categoryIcons[r.category] || '📖';
    const card = document.createElement('div');
    card.className = 'picker-recipe-card';
    card.innerHTML = `<span>${icon} ${r.title}</span><span style="font-size:0.85rem; color:#f4a261;">선택</span>`;
    
    card.onclick = () => {
      document.getElementById('meal-input').value = r.title;
      selectedMealIcon = icon;
      document.querySelectorAll('.icon-opt').forEach(b => {
        if (b.getAttribute('data-icon') === icon) b.classList.add('active');
        else b.classList.remove('active');
      });
      document.getElementById('recipe-picker-modal').classList.add('hidden');
    };

    listContainer.appendChild(card);
  });
}

document.getElementById('btn-close-modal').addEventListener('click', () => {
  document.getElementById('meal-modal').classList.add('hidden');
});

document.getElementById('btn-save-meal').addEventListener('click', async () => {
  const menuName = document.getElementById('meal-input').value.trim();
  const reason = document.getElementById('meal-reason-input').value.trim();

  if (selectedMealType === 'alone') {
    await db.from('meals').upsert({ 
      date: selectedDateStr, 
      menu_name: '따로먹음', 
      icon: '😭',
      meal_type: 'alone',
      reason: reason
    }, { onConflict: 'date' });
  } else if (menuName) {
    await db.from('meals').upsert({ 
      date: selectedDateStr, 
      menu_name: menuName, 
      icon: selectedMealIcon,
      meal_type: selectedMealType,
      reason: null
    }, { onConflict: 'date' });
  } else {
    await db.from('meals').delete().eq('date', selectedDateStr);
  }
  document.getElementById('meal-modal').classList.add('hidden');
  if (menuMode === 'weekly') renderWeeklyView();
  else renderMonthlyView();
});

// 🌟 월간 캘린더 (정확한 날짜 직접 매핑)
document.getElementById('prev-month').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderMonthlyView();
});
document.getElementById('next-month').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderMonthlyView();
});

async function renderMonthlyView() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  document.getElementById('current-month-label').innerText = `${year}년 ${month + 1}월`;

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  const startDateStr = formatDateStr(year, month + 1, 1);
  const endDateStr = formatDateStr(year, month + 1, lastDate);

  const { data: meals } = await db.from('meals').select('*').gte('date', startDateStr).lte('date', endDateStr);
  const mealsMap = {};
  (meals || []).forEach(m => mealsMap[m.date] = m);

  const grid = document.getElementById('monthly-grid');
  grid.innerHTML = '';

  for (let i = 0; i < firstDay; i++) {
    grid.innerHTML += `<div class="month-day-cell" style="background:transparent; box-shadow:none;"></div>`;
  }

  const todayStr = getTodayStr();

  for (let d = 1; d <= lastDate; d++) {
    const dateStr = formatDateStr(year, month + 1, d);
    const meal = mealsMap[dateStr];
    const isToday = dateStr === todayStr;

    const cell = document.createElement('div');
    const mealTypeClass = meal?.meal_type ? `meal-${meal.meal_type}` : '';
    cell.className = `month-day-cell ${isToday ? 'today' : ''} ${mealTypeClass}`;
    cell.onclick = () => handleMealClick(dateStr, meal);

    let textVal = meal?.menu_name || '';
    if (meal?.meal_type === 'alone') textVal = meal.reason ? `따로(${meal.reason})` : '따로먹음';

    cell.innerHTML = `
      <div class="month-day-number">${d}</div>
      ${meal ? `
        <div class="month-menu-box">
          <div class="month-menu-icon">${meal.icon || '🍲'}</div>
          <div class="month-menu-text">${textVal}</div>
        </div>
      ` : ''}
    `;
    grid.appendChild(cell);
  }
}

// === 📖 레시피 북 ===
document.querySelectorAll('.bookmark-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    document.querySelectorAll('.bookmark-tab').forEach(t => t.classList.remove('active'));
    
    const targetBtn = e.target.closest('.bookmark-tab');
    targetBtn.classList.add('active');
    
    currentRecipeCategory = targetBtn.getAttribute('data-cat');
    loadRecipes();
  });
});

async function loadRecipes() {
  const { data: recipes } = await db.from('recipes')
    .select('*')
    .eq('category', currentRecipeCategory)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  currentCategoryRecipes = recipes || [];
  showTocPage();
}

function showTocPage() {
  document.getElementById('recipe-toc-page').classList.remove('hidden');
  document.getElementById('recipe-detail-page').classList.add('hidden');
  document.getElementById('toc-cat-name').innerText = currentRecipeCategory;
  document.getElementById('toc-icon').innerText = categoryIcons[currentRecipeCategory] || '📋';

  const tocList = document.getElementById('toc-list');
  tocList.innerHTML = '';

  if (currentCategoryRecipes.length === 0) {
    tocList.innerHTML = `<div class="recipe-note-empty">아직 [${currentRecipeCategory}] 레시피가 없어요.<br>상단 '레시피 쓰기'로 등록해 보세요!</div>`;
    return;
  }

  currentCategoryRecipes.forEach((r, idx) => {
    const item = document.createElement('div');
    item.className = 'toc-item';

    const stars = '★'.repeat(r.difficulty || 1) + '☆'.repeat(5 - (r.difficulty || 1));

    item.innerHTML = `
      <div class="toc-item-left" onclick="openRecipeDetail(${idx})">
        <span>${idx + 1}. ${r.title}</span>
      </div>
      <div class="toc-item-right">
        <span class="toc-difficulty">${stars}</span>
        <div class="toc-order-btns">
          <button class="order-btn" onclick="moveRecipeOrder(${idx}, -1)">▲</button>
          <button class="order-btn" onclick="moveRecipeOrder(${idx}, 1)">▼</button>
        </div>
      </div>
    `;
    tocList.appendChild(item);
  });
}

async function moveRecipeOrder(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= currentCategoryRecipes.length) return;

  const currentRecipe = currentCategoryRecipes[index];
  const targetRecipe = currentCategoryRecipes[targetIndex];

  const tempOrder = currentRecipe.sort_order || index;
  currentRecipe.sort_order = targetRecipe.sort_order || targetIndex;
  targetRecipe.sort_order = tempOrder;

  await db.from('recipes').update({ sort_order: currentRecipe.sort_order }).eq('id', currentRecipe.id);
  await db.from('recipes').update({ sort_order: targetRecipe.sort_order }).eq('id', targetRecipe.id);

  await loadRecipes();
}

function openRecipeDetail(index) {
  currentRecipeIndex = index;
  document.getElementById('recipe-toc-page').classList.add('hidden');
  document.getElementById('recipe-detail-page').classList.remove('hidden');
  renderRecipeDetail();
}

function renderRecipeDetail() {
  const r = currentCategoryRecipes[currentRecipeIndex];
  if (!r) return showTocPage();

  document.getElementById('detail-title').innerText = `${currentRecipeIndex + 1}. ${r.title}`;
  
  let bodyHtml = '';
  if (r.ingredients) {
    bodyHtml += `<div class="recipe-note-section-title">[재료]</div><div class="recipe-note-text">${r.ingredients}</div>`;
  }
  if (r.sauce) {
    bodyHtml += `<div class="recipe-note-section-title" style="margin-top:36px;">[양념장]</div><div class="recipe-note-text">${r.sauce}</div>`;
  }
  if (r.instructions) {
    bodyHtml += `<div class="recipe-note-section-title" style="margin-top:36px;">[조리법 & 팁]</div><div class="recipe-note-text">${r.instructions}</div>`;
  }

  document.getElementById('detail-body').innerHTML = bodyHtml;

  const updatedDate = r.updated_at ? new Date(r.updated_at) : new Date(r.created_at);
  const dateStr = formatDateStr(updatedDate.getFullYear(), updatedDate.getMonth() + 1, updatedDate.getDate()).replace(/-/g, '.');
  document.getElementById('detail-updated-at').innerText = `최종 수정: ${dateStr}`;

  document.getElementById('page-indicator').innerText = `${currentRecipeIndex + 1} / ${currentCategoryRecipes.length}`;

  document.getElementById('btn-prev-page').disabled = (currentRecipeIndex === 0);
  document.getElementById('btn-next-page').disabled = (currentRecipeIndex === currentCategoryRecipes.length - 1);
}

document.getElementById('btn-prev-page').addEventListener('click', () => {
  if (currentRecipeIndex > 0) {
    currentRecipeIndex--;
    renderRecipeDetail();
  }
});

document.getElementById('btn-next-page').addEventListener('click', () => {
  if (currentRecipeIndex < currentCategoryRecipes.length - 1) {
    currentRecipeIndex++;
    renderRecipeDetail();
  }
});

document.getElementById('btn-back-to-toc').addEventListener('click', () => {
  showTocPage();
});

document.querySelectorAll('.star-opt').forEach(star => {
  star.addEventListener('click', (e) => {
    selectedDifficulty = parseInt(e.target.getAttribute('data-score'));
    updateStarRatingUI();
  });
});

function updateStarRatingUI() {
  document.querySelectorAll('.star-opt').forEach(star => {
    const score = parseInt(star.getAttribute('data-score'));
    if (score <= selectedDifficulty) star.classList.add('active');
    else star.classList.remove('active');
  });
}

document.getElementById('btn-edit-recipe').addEventListener('click', () => {
  const r = currentCategoryRecipes[currentRecipeIndex];
  if (!r) return;

  editingRecipeId = r.id;
  selectedDifficulty = r.difficulty || 1;
  updateStarRatingUI();

  document.getElementById('recipe-modal-title').innerText = '✏️ 레시피 수정';
  document.getElementById('recipe-title-input').value = r.title || '';
  document.getElementById('recipe-category-input').value = r.category || '국&찌개';
  document.getElementById('recipe-ingredients-input').value = r.ingredients || '';
  document.getElementById('recipe-sauce-input').value = r.sauce || '';
  document.getElementById('recipe-instructions-input').value = r.instructions || '';

  document.getElementById('recipe-add-modal').classList.remove('hidden');
});

const deleteModal = document.getElementById('recipe-delete-modal');
const deleteMsg = document.getElementById('delete-modal-msg');

document.getElementById('btn-open-delete-modal').addEventListener('click', () => {
  const r = currentCategoryRecipes[currentRecipeIndex];
  if (!r) return;

  deleteMsg.innerText = `'${r.title}' 레시피를 삭제하시겠습니까?`;
  deleteModal.classList.remove('hidden');
});

document.getElementById('btn-cancel-delete').addEventListener('click', () => {
  deleteModal.classList.add('hidden');
});

document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
  const r = currentCategoryRecipes[currentRecipeIndex];
  if (!r) return;

  await db.from('recipes').delete().eq('id', r.id);
  deleteModal.classList.add('hidden');
  await loadRecipes();
});

document.getElementById('btn-open-recipe-modal').addEventListener('click', () => {
  editingRecipeId = null;
  selectedDifficulty = 1;
  updateStarRatingUI();

  document.getElementById('recipe-modal-title').innerText = '🍳 새 레시피 등록';
  document.getElementById('recipe-title-input').value = '';
  document.getElementById('recipe-ingredients-input').value = '';
  document.getElementById('recipe-sauce-input').value = '';
  document.getElementById('recipe-instructions-input').value = '';
  document.getElementById('recipe-add-modal').classList.remove('hidden');
});

document.getElementById('btn-close-recipe-modal').addEventListener('click', () => {
  document.getElementById('recipe-add-modal').classList.add('hidden');
});

document.getElementById('btn-save-recipe').addEventListener('click', async () => {
  const title = document.getElementById('recipe-title-input').value.trim();
  const category = document.getElementById('recipe-category-input').value;
  const ingredients = document.getElementById('recipe-ingredients-input').value.trim();
  const sauce = document.getElementById('recipe-sauce-input').value.trim();
  const instructions = document.getElementById('recipe-instructions-input').value.trim();
  const nowStr = new Date().toISOString();

  if (!title) return alert('요리 이름을 입력해 주세요.');

  if (editingRecipeId) {
    await db.from('recipes').update({ 
      title, 
      category, 
      difficulty: selectedDifficulty,
      ingredients, 
      sauce, 
      instructions,
      updated_at: nowStr 
    }).eq('id', editingRecipeId);
  } else {
    const nextOrder = currentCategoryRecipes.length;
    await db.from('recipes').insert([{ 
      title, 
      category, 
      difficulty: selectedDifficulty,
      sort_order: nextOrder,
      ingredients, 
      sauce, 
      instructions,
      updated_at: nowStr 
    }]);
  }

  document.getElementById('recipe-add-modal').classList.add('hidden');

  currentRecipeCategory = category;
  document.querySelectorAll('.bookmark-tab').forEach(t => {
    if (t.getAttribute('data-cat') === category) t.classList.add('active');
    else t.classList.remove('active');
  });
  loadRecipes();
});

// 인기 레시피 통계
document.getElementById('btn-open-stats-modal').addEventListener('click', () => openPopularStatsModal());
document.getElementById('btn-close-stats-modal').addEventListener('click', () => {
  document.getElementById('recipe-stats-modal').classList.add('hidden');
});

function getPastelColor(index) {
  const colors = [
    '#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#264653',
    '#b5838d', '#e07a5f', '#81b29a', '#f2cc8f', '#6b705c'
  ];
  if (index < colors.length) return colors[index];
  const hue = (index * 137.5) % 360;
  return `hsl(${hue}, 65%, 65%)`;
}

async function openPopularStatsModal() {
  const { data: meals } = await db.from('meals').select('menu_name, meal_type');
  
  const countMap = {};
  let totalCount = 0;

  (meals || []).forEach(m => {
    const isHomeMeal = !m.meal_type || m.meal_type === 'home';
    if (m.menu_name && isHomeMeal) {
      countMap[m.menu_name] = (countMap[m.menu_name] || 0) + 1;
      totalCount++;
    }
  });

  const sortedMenus = Object.keys(countMap)
    .map(menu => ({ menu, count: countMap[menu] }))
    .sort((a, b) => b.count - a.count);

  renderPopularChart(sortedMenus, totalCount);

  const statsList = document.getElementById('stats-list');
  statsList.innerHTML = '';

  if (sortedMenus.length === 0) {
    statsList.innerHTML = `<div class="recipe-note-empty">아직 집밥 기록이 없어요!</div>`;
  } else {
    sortedMenus.forEach((item, idx) => {
      const color = getPastelColor(idx);
      const percent = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : 0;

      const div = document.createElement('div');
      div.className = 'stats-item';
      div.innerHTML = `
        <div class="stats-item-left">
          <span class="color-dot" style="background-color: ${color};"></span>
          <span>${idx + 1}. ${item.menu}</span>
        </div>
        <div><b>${item.count}회</b> (${percent}%)</div>
      `;
      statsList.appendChild(div);
    });
  }

  document.getElementById('recipe-stats-modal').classList.remove('hidden');
}

function renderPopularChart(sortedMenus, totalCount) {
  const canvas = document.getElementById('popularChart');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (totalCount === 0 || sortedMenus.length === 0) {
    ctx.fillStyle = '#d0c8be';
    ctx.beginPath();
    ctx.arc(110, 110, 80, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  let startAngle = -Math.PI / 2;

  sortedMenus.forEach((item, idx) => {
    const sliceAngle = (item.count / totalCount) * (Math.PI * 2);
    const color = getPastelColor(idx);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(110, 110);
    ctx.arc(110, 110, 85, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    startAngle += sliceAngle;
  });

  ctx.fillStyle = '#fffdfa';
  ctx.beginPath();
  ctx.arc(110, 110, 45, 0, Math.PI * 2);
  ctx.fill();
}

// === 🛒 장보기 ===
document.getElementById('prev-shop-week').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() - 7);
  loadShoppingList();
});
document.getElementById('next-shop-week').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() + 7);
  loadShoppingList();
});

// 주차 문자열 레이블 생성 도우미 (예: "2026-08-03" -> "8월 1주차")
function getWeekLabel(mondayDateStr) {
  if (!mondayDateStr) return '';
  const parts = mondayDateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const info = getWeekInfo(d);
  return `${info.month}월 ${info.weekNum}주차`;
}

// 장보기 아이템 파싱 (JSON 메타데이터 및 기존 일반 텍스트 데이터 호환)
function parseShoppingItem(item) {
  let name = item.item_name || '';
  let originWeek = item.week_start_date;
  let checkedWeek = item.is_checked ? item.week_start_date : null;

  if (name.startsWith('{') && name.endsWith('}')) {
    try {
      const parsed = JSON.parse(name);
      if (parsed.name) name = parsed.name;
      if (parsed.originWeek) originWeek = parsed.originWeek;
      if (parsed.checkedWeek !== undefined) checkedWeek = parsed.checkedWeek;
    } catch (e) {}
  }

  return {
    id: item.id,
    name: name,
    originWeek: originWeek || item.week_start_date,
    checkedWeek: item.is_checked ? (checkedWeek || item.week_start_date) : null,
    is_checked: !!item.is_checked,
    created_at: item.created_at
  };
}

async function loadShoppingList() {
  const monday = getMonday(currentDate);
  const mondayStr = formatDateStr(monday.getFullYear(), monday.getMonth() + 1, monday.getDate());
  const info = getWeekInfo(monday);

  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const sundayStr = formatDateStr(sunday.getFullYear(), sunday.getMonth() + 1, sunday.getDate());
  const startStr = mondayStr.slice(5).replace('-', '.');
  const endStr = sundayStr.slice(5).replace('-', '.');

  document.getElementById('shop-week-title').innerText = `${info.year}년 ${info.month}월 ${info.weekNum}주차`;
  document.getElementById('shop-week-range').innerText = `(${startStr} ~ ${endStr})`;

  const list = document.getElementById('shopping-list');
  list.innerHTML = '<div class="loading-box">🛒 장보기 목록을 불러오는 중...</div>';

  const { data: rawItems } = await db.from('shopping_items')
    .select('*')
    .order('created_at', { ascending: true });

  list.innerHTML = '';
  if (!rawItems || rawItems.length === 0) {
    list.innerHTML = '<div class="loading-box">사야 할 재료를 등록해 보세요!</div>';
    return;
  }

  const allParsed = rawItems.map(parseShoppingItem);
  const visibleItems = [];

  allParsed.forEach(item => {
    // 1. 최초 등록 주차가 현재 보고 있는 주차보다 미래이면 노출하지 않음
    if (item.originWeek > mondayStr) return;

    if (!item.is_checked) {
      // 2. 아직 체크되지 않은 항목: 등록 주차 이후의 모든 주차에 계속 자동 이월되어 미체크로 표시
      visibleItems.push({
        ...item,
        currentChecked: false,
        isRollover: item.originWeek < mondayStr
      });
    } else {
      // 3. 체크 완료된 항목:
      // - 현재 주차가 체크 완료된 주차 이전: 그 당시에는 아직 체크 안 했으므로 미체크 상태로 표시
      // - 현재 주차가 체크 완료된 주차와 동일: 이 주차에 체크 완료했으므로 체크 상태로 표시
      // - 현재 주차가 체크 완료된 주차 이후: 이미 과거 주차에 구매 완료되었으므로 표시 안 함 (이월 종료)
      const chkWeek = item.checkedWeek || item.originWeek;
      if (mondayStr < chkWeek) {
        visibleItems.push({
          ...item,
          currentChecked: false,
          isRollover: item.originWeek < mondayStr
        });
      } else if (mondayStr === chkWeek) {
        visibleItems.push({
          ...item,
          currentChecked: true,
          isRollover: item.originWeek < mondayStr
        });
      }
    }
  });

  if (visibleItems.length === 0) {
    list.innerHTML = '<div class="loading-box">사야 할 재료를 등록해 보세요!</div>';
    return;
  }

  visibleItems.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = `shopping-item ${item.currentChecked ? 'checked' : ''}`;
    
    const badgeHtml = item.isRollover
      ? `<span class="rollover-badge">📌 ${getWeekLabel(item.originWeek)} 등록</span>`
      : '';

    itemDiv.innerHTML = `
      <div class="shopping-item-left">
        <input type="checkbox" ${item.currentChecked ? 'checked' : ''} 
          onchange="toggleShoppingItem(${item.id}, this.checked)">
        <span class="shopping-item-name">${item.name}</span>
        ${badgeHtml}
      </div>
      <button class="btn-delete-item" onclick="deleteShoppingItem(${item.id})">✕</button>
    `;
    list.appendChild(itemDiv);
  });
}

document.getElementById('btn-add-shopping').addEventListener('click', async () => {
  const input = document.getElementById('shopping-input');
  const itemName = input.value.trim();
  if (!itemName) return;

  const monday = getMonday(currentDate);
  const mondayStr = formatDateStr(monday.getFullYear(), monday.getMonth() + 1, monday.getDate());
  
  const payload = {
    name: itemName,
    originWeek: mondayStr,
    checkedWeek: null
  };

  await db.from('shopping_items').insert([{
    week_start_date: mondayStr,
    item_name: JSON.stringify(payload),
    is_checked: false
  }]);

  input.value = '';
  loadShoppingList();
});

// 엔터 키로도 장보기 항목 추가 지원
document.getElementById('shopping-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('btn-add-shopping').click();
  }
});

async function toggleShoppingItem(id, isChecked) {
  const monday = getMonday(currentDate);
  const currentMondayStr = formatDateStr(monday.getFullYear(), monday.getMonth() + 1, monday.getDate());

  const { data: item } = await db.from('shopping_items').select('*').eq('id', id).single();
  if (!item) return;

  const parsed = parseShoppingItem(item);
  const updatedPayload = {
    name: parsed.name,
    originWeek: parsed.originWeek,
    checkedWeek: isChecked ? currentMondayStr : null
  };

  await db.from('shopping_items').update({
    is_checked: isChecked,
    item_name: JSON.stringify(updatedPayload)
  }).eq('id', id);

  loadShoppingList();
}

async function deleteShoppingItem(id) {
  await db.from('shopping_items').delete().eq('id', id);
  loadShoppingList();
}

document.querySelectorAll('input, textarea, select').forEach(element => {
  element.addEventListener('blur', () => {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
  });
});

switchMainTab('menu');
