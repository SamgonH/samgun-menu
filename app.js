// 1. Supabase 연동 설정
const SUPABASE_URL = "https://nflgvgekvlihbciwiluz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mbGd2Z2VrdmxpaGJjaXdpbHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3OTI3NDksImV4cCI6MjEwMTM2ODc0OX0.Dv51jnRlvJeh7ZHlikdBaidaGeU6wRIxwMTBNrUU79g";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 상태 변수
let currentDate = new Date();
let selectedDateStr = null;
let currentTab = 'menu';
let menuMode = 'weekly';

// 레시피 북 상태
let currentRecipeCategory = '국&찌개';
let currentCategoryRecipes = []; 
let currentRecipeIndex = 0;       

let calModalDate = new Date();

// DOM 요소
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

// 주차 계산 함수
function getWeekInfo(d) {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const firstDayOfMonth = new Date(year, date.getMonth(), 1);
  const firstDayWeekday = firstDayOfMonth.getDay() === 0 ? 7 : firstDayOfMonth.getDay();
  const weekNum = Math.ceil((date.getDate() + firstDayWeekday - 1) / 7);
  return { year, month, weekNum };
}

// 월요일 구하기 함수
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

// 메인 탭 전환
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

// 상단 토글 (주간/월간)
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
  calModalDate = new Date(currentDate);
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
    const d = new Date(selMonday);
    d.setDate(selMonday.getDate() + i);
    selWeekDates.push(d.toISOString().split('T')[0]);
  }

  for (let x = firstDayIndex; x > 0; x--) {
    const dayNum = prevLastDate - x + 1;
    const d = new Date(year, month - 1, dayNum);
    createCalCell(grid, dayNum, d.toISOString().split('T')[0], true, selWeekDates);
  }

  for (let i = 1; i <= lastDate; i++) {
    const d = new Date(year, month, i);
    createCalCell(grid, i, d.toISOString().split('T')[0], false, selWeekDates);
  }

  const totalCells = firstDayIndex + lastDate;
  const nextDays = (42 - totalCells) % 7;
  for (let j = 1; j <= nextDays; j++) {
    const d = new Date(year, month + 1, j);
    createCalCell(grid, j, d.toISOString().split('T')[0], true, selWeekDates);
  }
}

function createCalCell(container, dayNum, dateStr, isOtherMonth, selWeekDates) {
  const cell = document.createElement('div');
  const inWeek = selWeekDates.includes(dateStr);
  const isTargetDay = dateStr === currentDate.toISOString().split('T')[0];

  cell.className = `cal-day-cell ${isOtherMonth ? 'other-month' : ''} ${inWeek && (menuMode === 'weekly' || currentTab === 'shopping') ? 'in-selected-week' : ''} ${isTargetDay ? 'selected-day' : ''}`;
  cell.innerText = dayNum;

  cell.onclick = () => {
    currentDate = new Date(dateStr);
    document.getElementById('custom-calendar-modal').classList.add('hidden');
    if (currentTab === 'shopping') loadShoppingList();
    else if (menuMode === 'weekly') renderWeeklyView();
    else renderMonthlyView();
  };

  container.appendChild(cell);
}

// === 주간 캘린더 ===
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
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
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

  weekDates.forEach((dateStr, idx) => {
    const meal = mealsMap[dateStr];
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    const card = document.createElement('div');
    card.className = `day-card ${isToday ? 'today' : ''}`;

    card.innerHTML = `
      <div class="day-info" onclick="openMealModal('${dateStr}', '${meal?.menu_name || ''}')">
        <span class="day-name">${dateStr.slice(5)} (${dayNames[idx]})</span>
        <span class="menu-text ${!meal?.menu_name ? 'empty' : ''}">
          ${meal?.menu_name || '메뉴를 등록해 보세요'}
        </span>
      </div>
    `;
    weeklyList.appendChild(card);
  });
}

// 식사 입력 모달
async function openMealModal(dateStr, currentMenu) {
  selectedDateStr = dateStr;
  document.getElementById('modal-date-title').innerText = `${dateStr} 저녁메뉴`;
  document.getElementById('meal-input').value = currentMenu;
  
  const { data: recipes } = await db.from('recipes').select('*');
  const dropdown = document.getElementById('recipe-dropdown');
  dropdown.innerHTML = '<option value="">-- 레시피 선택 --</option>';
  (recipes || []).forEach(r => {
    dropdown.innerHTML += `<option value="${r.title}">${r.title}</option>`;
  });

  document.getElementById('meal-modal').classList.remove('hidden');
}

document.getElementById('recipe-dropdown').addEventListener('change', (e) => {
  if (e.target.value) {
    document.getElementById('meal-input').value = e.target.value;
  }
});

document.getElementById('btn-close-modal').addEventListener('click', () => {
  document.getElementById('meal-modal').classList.add('hidden');
});

document.getElementById('btn-save-meal').addEventListener('click', async () => {
  const menuName = document.getElementById('meal-input').value.trim();
  if (menuName) {
    await db.from('meals').upsert({ date: selectedDateStr, menu_name: menuName }, { onConflict: 'date' });
  } else {
    await db.from('meals').delete().eq('date', selectedDateStr);
  }
  document.getElementById('meal-modal').classList.add('hidden');
  if (menuMode === 'weekly') renderWeeklyView();
  else renderMonthlyView();
});

// 월간 캘린더
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

  const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${lastDate}`;

  const { data: meals } = await db.from('meals').select('*').gte('date', startDateStr).lte('date', endDateStr);
  const mealsMap = {};
  (meals || []).forEach(m => mealsMap[m.date] = m);

  const grid = document.getElementById('monthly-grid');
  grid.innerHTML = '';

  for (let i = 0; i < firstDay; i++) {
    grid.innerHTML += `<div class="month-day-cell" style="background:transparent; box-shadow:none;"></div>`;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const meal = mealsMap[dateStr];
    const isToday = dateStr === todayStr;

    const cell = document.createElement('div');
    cell.className = `month-day-cell ${isToday ? 'today' : ''}`;
    cell.onclick = () => openMealModal(dateStr, meal?.menu_name || '');

    cell.innerHTML = `
      <div class="month-day-number">${d}</div>
      ${meal ? `<div class="month-menu-preview">${meal.menu_name}</div>` : ''}
    `;
    grid.appendChild(cell);
  }
}

// === 📖 레시피 북 (카테고리 연동 / 목차 / 상세 / 넘기기 / 삭제) ===
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
    .order('created_at', { ascending: false });

  currentCategoryRecipes = recipes || [];
  showTocPage();
}

// 목차 뷰
function showTocPage() {
  document.getElementById('recipe-toc-page').classList.remove('hidden');
  document.getElementById('recipe-detail-page').classList.add('hidden');
  document.getElementById('toc-cat-name').innerText = currentRecipeCategory;

  const tocList = document.getElementById('toc-list');
  tocList.innerHTML = '';

  if (currentCategoryRecipes.length === 0) {
    tocList.innerHTML = `<div class="recipe-note-empty">아직 [${currentRecipeCategory}] 레시피가 없어요.<br>상단 '레시피 쓰기'로 등록해 보세요!</div>`;
    return;
  }

  currentCategoryRecipes.forEach((r, idx) => {
    const item = document.createElement('div');
    item.className = 'toc-item';
    item.innerHTML = `<span>✏️ ${r.title}</span><span style="color:#e07a5f; font-size:1.1rem;">▶</span>`;
    item.onclick = () => openRecipeDetail(idx);
    tocList.appendChild(item);
  });
}

// 상세 레시피 뷰
function openRecipeDetail(index) {
  currentRecipeIndex = index;
  document.getElementById('recipe-toc-page').classList.add('hidden');
  document.getElementById('recipe-detail-page').classList.remove('hidden');
  renderRecipeDetail();
}

function renderRecipeDetail() {
  const r = currentCategoryRecipes[currentRecipeIndex];
  if (!r) return showTocPage();

  document.getElementById('detail-title').innerText = `✏️ ${r.title}`;
  
  // 36px 줄 간격 피팅
  document.getElementById('detail-body').innerHTML = `
    ${r.ingredients ? `<div style="color:#e07a5f; line-height:36px;">[필요한 재료]</div><div style="line-height:36px;">${r.ingredients}</div>` : ''}
    ${r.instructions ? `<div style="color:#e07a5f; line-height:36px; margin-top:36px;">[조리법 & 팁]</div><div style="line-height:36px;">${r.instructions}</div>` : ''}
  `;

  document.getElementById('page-indicator').innerText = `${currentRecipeIndex + 1} / ${currentCategoryRecipes.length}`;

  document.getElementById('btn-prev-page').disabled = (currentRecipeIndex === 0);
  document.getElementById('btn-next-page').disabled = (currentRecipeIndex === currentCategoryRecipes.length - 1);
}

// 책장 넘기기
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

// 커스텀 삭제 팝업 모달 제어
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

// 레시피 등록 모달
document.getElementById('btn-open-recipe-modal').addEventListener('click', () => {
  document.getElementById('recipe-add-modal').classList.remove('hidden');
});
document.getElementById('btn-close-recipe-modal').addEventListener('click', () => {
  document.getElementById('recipe-add-modal').classList.add('hidden');
});

document.getElementById('btn-save-recipe').addEventListener('click', async () => {
  const title = document.getElementById('recipe-title-input').value.trim();
  const category = document.getElementById('recipe-category-input').value;
  const ingredients = document.getElementById('recipe-ingredients-input').value.trim();
  const instructions = document.getElementById('recipe-instructions-input').value.trim();

  if (!title) return alert('요리 이름을 입력해 주세요.');

  await db.from('recipes').insert([{ title, category, ingredients, instructions }]);
  document.getElementById('recipe-title-input').value = '';
  document.getElementById('recipe-ingredients-input').value = '';
  document.getElementById('recipe-instructions-input').value = '';
  document.getElementById('recipe-add-modal').classList.add('hidden');

  currentRecipeCategory = category;
  document.querySelectorAll('.bookmark-tab').forEach(t => {
    if (t.getAttribute('data-cat') === category) t.classList.add('active');
    else t.classList.remove('active');
  });
  loadRecipes();
});

// === 🛒 장보기 (주간 이동 연동) ===
document.getElementById('prev-shop-week').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() - 7);
  loadShoppingList();
});
document.getElementById('next-shop-week').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() + 7);
  loadShoppingList();
});

async function loadShoppingList() {
  const monday = getMonday(currentDate);
  const mondayStr = monday.toISOString().split('T')[0];
  const info = getWeekInfo(monday);

  const sundayStr = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const startStr = mondayStr.slice(5).replace('-', '.');
  const endStr = sundayStr.slice(5).replace('-', '.');

  document.getElementById('shop-week-title').innerText = `${info.year}년 ${info.month}월 ${info.weekNum}주차`;
  document.getElementById('shop-week-range').innerText = `(${startStr} ~ ${endStr})`;

  const list = document.getElementById('shopping-list');
  list.innerHTML = '<div class="loading-box">🛒 장보기 목록을 불러오는 중...</div>';

  const { data: items } = await db.from('shopping_items')
    .select('*')
    .eq('week_start_date', mondayStr)
    .order('created_at', { ascending: true });

  list.innerHTML = '';
  if (!items || items.length === 0) {
    list.innerHTML = '<div class="loading-box">사야 할 재료를 등록해 보세요!</div>';
    return;
  }

  items.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = `shopping-item ${item.is_checked ? 'checked' : ''}`;
    itemDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <input type="checkbox" ${item.is_checked ? 'checked' : ''} 
          onchange="toggleShoppingItem(${item.id}, this.checked)">
        <span>${item.item_name}</span>
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

  const mondayStr = getMonday(currentDate).toISOString().split('T')[0];
  await db.from('shopping_items').insert([{ week_start_date: mondayStr, item_name: itemName }]);
  input.value = '';
  loadShoppingList();
});

async function toggleShoppingItem(id, isChecked) {
  await db.from('shopping_items').update({ is_checked: isChecked }).eq('id', id);
  loadShoppingList();
}

async function deleteShoppingItem(id) {
  await db.from('shopping_items').delete().eq('id', id);
  loadShoppingList();
}

// 초기 실행
switchMainTab('menu');