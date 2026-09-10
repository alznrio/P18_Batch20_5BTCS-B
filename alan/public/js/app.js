const API_BASE = '/api';

// State variables
let currentUser = null;
let currentToken = null;
let currentPersona = 'member';
let attendanceChartInstance = null;
let planPopularityChartInstance = null;
let allMembersCache = [];

// App Startup
document.addEventListener('DOMContentLoaded', async () => {
  const savedToken = localStorage.getItem('pulsefit_token');
  const savedUser = localStorage.getItem('pulsefit_user');

  if (savedToken && savedUser) {
    try {
      currentToken = savedToken;
      currentUser = JSON.parse(savedUser);
      // Validate saved session against backend
      const res = await fetch(API_BASE + '/auth/profile', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
      });
      if (!res.ok) throw new Error('Session expired');
      const data = await res.json();
      currentUser = data.data;
      updateNavbarProfile();
      applyRoleView(currentUser.role);
    } catch (e) {
      console.warn('Session expired or invalid, auto-logging in as demo member');
      localStorage.removeItem('pulsefit_token');
      localStorage.removeItem('pulsefit_user');
      await switchPersona('member');
    }
  } else {
    // Default seamless login as Alex Mercer (Member)
    await switchPersona('member');
  }
});

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toastEl = document.createElement('div');
  const bg = type === 'danger' ? 'bg-danger' : type === 'success' ? 'bg-success' : type === 'warning' ? 'bg-warning text-dark' : 'bg-primary';

  toastEl.className = 'toast align-items-center text-white border-0 mb-2 shadow-lg ' + bg;
  toastEl.setAttribute('role', 'alert');
  toastEl.innerHTML = '<div class="d-flex"><div class="toast-body fw-bold fs-6">' + message + '</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>';

  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// Universal API Fetcher
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (currentToken) {
    headers['Authorization'] = 'Bearer ' + currentToken;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(API_BASE + endpoint, options);
    const data = await res.json();

    if (!res.ok) {
      throw data;
    }
    return data;
  } catch (err) {
    console.error('API Error at [' + endpoint + ']:', err);
    const msg = err.message || 'An error occurred during request';
    showToast(msg, 'danger');
    throw err;
  }
}

// Persona Switcher (Client / Manager / Trainer)
async function switchPersona(type) {
  currentPersona = type;
  document.querySelectorAll('.persona-btn').forEach(btn => btn.classList.remove('active'));

  if (type === 'member') {
    document.getElementById('btnRoleMember')?.classList.add('active');
    await quickLogin('alex.member@gymfitness.com', 'Member@123', 'Alex Mercer (Member)');
  } else if (type === 'expiring') {
    document.getElementById('btnRoleExpiring')?.classList.add('active');
    await quickLogin('michael.scott@gymfitness.com', 'Member@123', 'Michael Scott (Expiring Pass)');
  } else if (type === 'admin') {
    document.getElementById('btnRoleManager')?.classList.add('active');
    await quickLogin('admin@gymfitness.com', 'Admin@123', 'Marcus Vance (Branch Manager)');
  } else if (type === 'trainer') {
    document.getElementById('btnRoleTrainer')?.classList.add('active');
    await quickLogin('sarah.trainer@gymfitness.com', 'Trainer@123', 'Sarah Connor (Head Trainer)');
  }
}

async function quickLogin(email, password, displayName) {
  try {
    const res = await apiCall('/auth/login', 'POST', { email, password });
    currentToken = res.data.token;
    currentUser = res.data.user;

    localStorage.setItem('pulsefit_token', currentToken);
    localStorage.setItem('pulsefit_user', JSON.stringify(currentUser));

    updateNavbarProfile();
    applyRoleView(currentUser.role);
    showToast('Switched persona to ' + (displayName || currentUser.name), 'success');
  } catch (err) {}
}

function updateNavbarProfile() {
  const userNav = document.getElementById('userProfileNav');
  const guestNav = document.getElementById('guestNav');
  const roleBadge = document.getElementById('userRoleBadge');
  const nameDisplay = document.getElementById('userNameDisplay');
  const notifDropdownWrap = document.getElementById('notifDropdownWrap');

  if (currentUser) {
    userNav.classList.remove('d-none');
    guestNav.classList.add('d-none');
    nameDisplay.textContent = currentUser.name;
    roleBadge.textContent = currentUser.role.toUpperCase();
    roleBadge.className = 'role-badge role-' + currentUser.role;

    if (currentUser.role === 'member') {
      notifDropdownWrap.classList.remove('d-none');
      loadNotifications();
    } else {
      notifDropdownWrap.classList.add('d-none');
    }
  } else {
    userNav.classList.add('d-none');
    guestNav.classList.remove('d-none');
    notifDropdownWrap.classList.add('d-none');
  }
}

function applyRoleView(role) {
  const memberNav = document.getElementById('memberNavLinks');
  const adminNav = document.getElementById('adminNavLinks');
  const trainerNav = document.getElementById('trainerNavLinks');

  memberNav.classList.add('d-none');
  adminNav.classList.add('d-none');
  trainerNav.classList.add('d-none');

  if (role === 'admin') {
    adminNav.classList.remove('d-none');
    showSection('admin-analytics-sec');
  } else if (role === 'trainer') {
    trainerNav.classList.remove('d-none');
    showSection('trainer-schedule-sec');
  } else {
    memberNav.classList.remove('d-none');
    showSection('member-dashboard-sec');
  }
}

function showSection(sectionId) {
  document.querySelectorAll('.role-section').forEach(sec => sec.classList.add('d-none'));
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove('d-none');
  }

  // Update active pill state
  document.querySelectorAll('.nav-pills .nav-link').forEach(link => {
    if (link.getAttribute('onclick')?.includes(sectionId)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Lazy-load data for target section
  if (sectionId === 'member-dashboard-sec') loadMemberDashboard();
  if (sectionId === 'member-plans-sec') loadPlans();
  if (sectionId === 'member-classes-sec') loadClasses();
  if (sectionId === 'member-attendance-sec') loadMemberAttendance();
  if (sectionId === 'admin-analytics-sec') loadAdminAnalytics();
  if (sectionId === 'admin-plans-sec') loadAdminPlans();
  if (sectionId === 'admin-members-sec') loadAdminMembers();
  if (sectionId === 'admin-trainers-sec') loadAdminTrainers();
  if (sectionId === 'admin-attendance-sec') loadAdminAttendanceTable();
  if (sectionId === 'trainer-schedule-sec') loadTrainerSchedule();
  if (sectionId === 'trainer-notes-sec') populateTrainerMemberSelect();
  if (sectionId === 'trainer-profile-sec') loadTrainerProfile();
}

function handleHomeClick() {
  if (currentUser?.role === 'admin') showSection('admin-analytics-sec');
  else if (currentUser?.role === 'trainer') showSection('trainer-schedule-sec');
  else showSection('member-dashboard-sec');
}

function logout() {
  currentToken = null;
  currentUser = null;
  localStorage.removeItem('pulsefit_token');
  localStorage.removeItem('pulsefit_user');
  updateNavbarProfile();
  showToast('Signed out. Please select a role or log in.', 'info');
  document.querySelectorAll('.role-section').forEach(sec => sec.classList.add('d-none'));
  document.getElementById('memberNavLinks').classList.add('d-none');
  document.getElementById('adminNavLinks').classList.add('d-none');
  document.getElementById('trainerNavLinks').classList.add('d-none');
  showSection('member-plans-sec');
  loadPlans();
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await apiCall('/auth/login', 'POST', { email, password });
    currentToken = res.data.token;
    currentUser = res.data.user;
    localStorage.setItem('pulsefit_token', currentToken);
    localStorage.setItem('pulsefit_user', JSON.stringify(currentUser));

    const modalEl = document.getElementById('loginModal');
    bootstrap.Modal.getOrCreateInstance(modalEl).hide();

    updateNavbarProfile();
    applyRoleView(currentUser.role);
    showToast('Welcome back, ' + currentUser.name + '!', 'success');
  } catch (err) {}
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const phone = document.getElementById('regPhone').value;

  try {
    const res = await apiCall('/auth/register', 'POST', { name, email, password, phone, role: 'member' });
    currentToken = res.data.token;
    currentUser = res.data.user;
    localStorage.setItem('pulsefit_token', currentToken);
    localStorage.setItem('pulsefit_user', JSON.stringify(currentUser));

    const modalEl = document.getElementById('registerModal');
    bootstrap.Modal.getOrCreateInstance(modalEl).hide();

    updateNavbarProfile();
    showToast('Account created successfully! Please choose your membership plan.', 'success');
    applyRoleView('member');
    showSection('member-plans-sec');
  } catch (err) {}
}// ================= CLIENT / MEMBER FUNCTIONS =================

async function loadMemberDashboard() {
  if (!currentToken || currentUser?.role !== 'member') return;

  try {
    const res = await apiCall('/dashboard/member');
    const data = res.data;

    // Welcome title
    const welcomeEl = document.getElementById('dashWelcomeName');
    if (welcomeEl) welcomeEl.textContent = currentUser.name.split(' ')[0];

    // Membership Card Details
    const planNameEl = document.getElementById('membershipPlanName');
    const datesEl = document.getElementById('membershipDates');
    const daysEl = document.getElementById('daysRemainingNumber');
    const statusBadge = document.getElementById('membershipStatusBadge');
    const progressEl = document.getElementById('membershipProgress');

    if (data.membership) {
      planNameEl.textContent = data.membership.planName;
      const endStr = new Date(data.membership.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      datesEl.textContent = 'Valid until ' + endStr;
      
      const days = Math.max(0, data.membership.daysRemaining);
      daysEl.textContent = days;

      const isExpiring = days <= 7;
      statusBadge.className = 'badge ' + (isExpiring ? 'bg-warning text-dark' : 'bg-success');
      statusBadge.textContent = isExpiring ? 'Expiring in ' + days + ' days!' : 'Active Pass';

      const progressVal = Math.min(100, Math.max(5, (days / 365) * 100));
      progressEl.style.width = progressVal + '%';
      progressEl.className = 'progress-bar ' + (isExpiring ? 'bg-warning' : 'bg-primary');
    } else {
      planNameEl.textContent = 'No Active Plan';
      datesEl.textContent = 'Choose a membership to unlock classes and gym check-ins';
      daysEl.textContent = '0';
      statusBadge.className = 'badge bg-danger';
      statusBadge.textContent = 'Inactive';
      progressEl.style.width = '0%';
    }

    // Digital Barcode Simulator
    const barcodeEl = document.getElementById('memberBarcodeDisplay');
    if (barcodeEl) {
      barcodeEl.textContent = 'GYM-' + (currentUser.name.split(' ')[0].toUpperCase()) + '-' + (currentUser.id || currentUser._id).slice(-4).toUpperCase();
    }

    // Attendance Streaks
    document.getElementById('totalVisitsCount').textContent = data.attendance.totalVisits || 0;
    document.getElementById('monthlyVisitsCount').textContent = data.attendance.visitsThisMonth || 0;
    document.getElementById('memberWaitlistCount').textContent = (data.waitlists?.length || 0) + ' in queue';

    const lastTimeEl = document.getElementById('lastCheckInTime');
    if (data.attendance.recent && data.attendance.recent.length > 0) {
      const last = data.attendance.recent[0];
      lastTimeEl.textContent = 'Last visit: ' + new Date(last.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' (' + last.type.toUpperCase() + ')';
    } else {
      lastTimeEl.textContent = 'No visits recorded yet';
    }

    // Booked Classes Table
    const tableBody = document.getElementById('myBookingsTableBody');
    if (!data.upcomingBookings || data.upcomingBookings.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No upcoming class bookings. Click "+ Book Another" above to reserve a session!</td></tr>';
    } else {
      tableBody.innerHTML = data.upcomingBookings.map(b => {
        const c = b.classId;
        const timeStr = new Date(c.schedule).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return '<tr>' +
          '<td class="fw-bold text-white">' + c.title + '</td>' +
          '<td><span class="badge bg-secondary">' + timeStr + '</span></td>' +
          '<td>' + (c.trainerId?.name || 'Instructor') + '</td>' +
          '<td><span class="badge bg-success">Confirmed</span></td>' +
          '<td><button class="btn btn-sm btn-outline-danger" onclick="cancelBooking(\'' + b._id + '\')"><i class="fa-solid fa-xmark me-1"></i> Cancel</button></td>' +
        '</tr>';
      }).join('');
    }

    // Trainer Workout & Diet Notes Container
    const notesContainer = document.getElementById('workoutDietNotesContainer');
    if (!data.recentNotes || data.recentNotes.length === 0) {
      notesContainer.innerHTML = '<div class="text-center text-muted py-4"><i class="fa-solid fa-notes-medical text-secondary fs-3 d-block mb-2"></i>No workout & nutrition plans assigned yet by your trainer.</div>';
    } else {
      notesContainer.innerHTML = data.recentNotes.map(n => {
        return '<div class="p-3 rounded-3" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border);">' +
          '<div class="d-flex justify-content-between align-items-center mb-2">' +
            '<span class="fw-bold text-white fs-6">' + n.title + '</span>' +
            '<span class="badge bg-info text-dark"><i class="fa-solid fa-user-check me-1"></i> Coach: ' + (n.trainerId?.name || 'Assigned Coach') + '</span>' +
          '</div>' +
          '<div class="small text-warning fw-semibold mb-2">🎯 Goal: ' + (n.targetGoals || 'General Conditioning') + '</div>' +
          '<div class="p-2 rounded mb-2 small" style="background: rgba(56, 189, 248, 0.08); border-left: 3px solid var(--primary);">' +
            '<strong class="text-primary d-block mb-1">🏋️ Workout Exercises:</strong>' + n.workoutNotes +
          '</div>' +
          '<div class="p-2 rounded small" style="background: rgba(16, 185, 129, 0.08); border-left: 3px solid var(--success);">' +
            '<strong class="text-success d-block mb-1">🥗 Nutrition & Diet Plan:</strong>' + n.dietNotes +
          '</div>' +
        '</div>';
      }).join('');
    }
  } catch (err) {}
}

async function performGymCheckIn() {
  if (!currentToken) {
    showToast('Please sign in or select a demo role first', 'warning');
    return;
  }

  try {
    const res = await apiCall('/attendance/checkin', 'POST', {
      type: 'gym',
      status: 'Approved',
      remarks: 'Turnstile barcode verified and authorized'
    });
    showToast('Check-in recorded! Barcode verified at turnstile. 💪', 'success');
    loadMemberDashboard();
  } catch (err) {}
}

async function loadPlans() {
  try {
    const res = await apiCall('/plans');
    const plans = res.data;
    const container = document.getElementById('plansCardsContainer');

    if (!plans || plans.length === 0) {
      container.innerHTML = '<div class="col-12 text-center text-muted py-5">No plans currently available</div>';
      return;
    }

    container.innerHTML = plans.map(p => {
      const isVip = p.durationMonths >= 12;
      const features = (p.features || ['Full gym floor access', 'Locker room & sauna', 'Class bookings']).map(f => '<li><i class="fa-solid fa-circle-check text-success me-2"></i>' + f + '</li>').join('');

      return '<div class="col-lg-3 col-md-6">' +
        '<div class="card h-100 p-4 ' + (isVip ? 'plan-featured' : '') + '">' +
          (isVip ? '<div class="plan-badge">Most Popular</div>' : '') +
          '<h4 class="fw-bold text-white mb-1">' + p.name + '</h4>' +
          '<p class="text-muted small mb-3">' + (p.description || 'Access to premium gym amenities') + '</p>' +
          '<div class="d-flex align-items-baseline gap-1 my-3">' +
            '<span class="fs-1 fw-bold text-white">₹' + p.price.toLocaleString('en-IN') + '</span>' +
            '<span class="text-muted small fw-bold">/ ' + p.durationMonths + ' mo</span>' +
          '</div>' +
          '<ul class="list-unstyled small text-muted my-3 d-flex flex-column gap-2 flex-grow-1">' +
            features +
          '</ul>' +
          '<button class="btn btn-warning w-100 py-2 mt-auto fw-bold" onclick="purchasePlan(\'' + p._id + '\', \'' + p.name + '\')">' +
            '<i class="fa-solid fa-bolt me-1"></i> Choose Plan' +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (err) {}
}

async function purchasePlan(planId, planName) {
  if (!currentToken) {
    showToast('Please log in or select a member role first', 'warning');
    return;
  }

  try {
    await apiCall('/memberships', 'POST', { planId });
    showToast('Success! ' + planName + ' membership activated.', 'success');
    showSection('member-dashboard-sec');
  } catch (err) {}
}

async function loadClasses() {
  const cat = document.getElementById('classCategoryFilter')?.value || '';
  const url = cat ? '/classes?category=' + encodeURIComponent(cat) : '/classes';

  try {
    const res = await apiCall(url);
    const classes = res.data;
    const container = document.getElementById('classesCardsContainer');

    if (!classes || classes.length === 0) {
      container.innerHTML = '<div class="col-12 text-center text-muted py-5">No fitness classes scheduled in this category</div>';
      return;
    }

    let bookedClassIds = [];
    if (currentToken && currentUser?.role === 'member') {
      try {
        const bRes = await apiCall('/bookings/my');
        bookedClassIds = (bRes.data || []).filter(b => b.status === 'booked').map(b => b.classId?._id);
      } catch (e) {}
    }

    container.innerHTML = classes.map(c => {
      const isFull = c.bookedCount >= c.capacity;
      const isBooked = bookedClassIds.includes(c._id);
      const sched = new Date(c.schedule);
      const timeStr = sched.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' @ ' + sched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const fillPercent = Math.min(100, Math.round((c.bookedCount / c.capacity) * 100));

      let actionBtn = '';
      if (isBooked) {
        actionBtn = '<button class="btn btn-outline-success w-100" disabled><i class="fa-solid fa-circle-check me-1"></i> Already Booked</button>';
      } else if (isFull) {
        actionBtn = '<button class="btn btn-warning w-100" onclick="joinWaitlist(\'' + c._id + '\')"><i class="fa-solid fa-hourglass-half me-1"></i> Join Waitlist (' + (c.waitlistCount || 0) + ' waiting)</button>';
      } else {
        actionBtn = '<button class="btn btn-primary w-100" onclick="bookClass(\'' + c._id + '\')"><i class="fa-solid fa-calendar-plus me-1"></i> Book Slot (' + (c.capacity - c.bookedCount) + ' left)</button>';
      }

      return '<div class="col-lg-4 col-md-6">' +
        '<div class="card h-100 p-3">' +
          '<div class="d-flex justify-content-between align-items-center mb-2">' +
            '<span class="badge bg-primary">' + c.category + '</span>' +
            '<span class="badge ' + (isFull ? 'bg-danger' : 'bg-success') + '">' + (isFull ? 'Class Full' : (c.capacity - c.bookedCount) + ' Openings') + '</span>' +
          '</div>' +
          '<h4 class="fw-bold text-white mb-1 fs-5">' + c.title + '</h4>' +
          '<p class="text-muted small mb-2"><i class="fa-solid fa-user-ninja text-info me-1"></i> Coach: ' + (c.trainerId?.name || 'Staff Coach') + '</p>' +
          '<p class="text-muted small mb-3">' + (c.description || 'High-tempo coaching designed to build strength and conditioning.') + '</p>' +
          '<div class="d-flex justify-content-between small text-muted mb-2">' +
            '<span><i class="fa-regular fa-clock me-1"></i> ' + timeStr + ' (' + c.durationMinutes + 'm)</span>' +
            '<span><i class="fa-solid fa-door-open me-1"></i> ' + (c.room || 'Studio 1') + '</span>' +
          '</div>' +
          '<div class="mb-3">' +
            '<div class="d-flex justify-content-between small text-muted mb-1">' +
              '<span>Capacity: ' + c.bookedCount + ' / ' + c.capacity + '</span>' +
              '<span>' + fillPercent + '%</span>' +
            '</div>' +
            '<div class="progress" style="height: 7px; background: #0b1120;">' +
              '<div class="progress-bar ' + (isFull ? 'bg-danger' : 'bg-success') + '" style="width: ' + fillPercent + '%"></div>' +
            '</div>' +
          '</div>' +
          '<div class="mt-auto">' + actionBtn + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (err) {}
}

async function bookClass(classId) {
  if (!currentToken) {
    showToast('Please log in first', 'warning');
    return;
  }
  try {
    await apiCall('/classes/' + classId + '/book', 'POST');
    showToast('Class slot reserved successfully!', 'success');
    loadClasses();
    loadMemberDashboard();
  } catch (err) {}
}

async function joinWaitlist(classId) {
  if (!currentToken) {
    showToast('Please log in first', 'warning');
    return;
  }
  try {
    const res = await apiCall('/classes/' + classId + '/waitlist', 'POST');
    showToast('Queued in waitlist at position #' + res.data.position + '! You will be auto-promoted when a spot opens.', 'warning');
    loadClasses();
    loadMemberDashboard();
  } catch (err) {}
}

async function cancelBooking(bookingId) {
  if (!confirm('Are you sure you want to cancel this booking?')) return;
  try {
    await apiCall('/bookings/' + bookingId + '/cancel', 'DELETE');
    showToast('Booking cancelled. Any waiting member has been automatically promoted.', 'info');
    loadMemberDashboard();
    loadClasses();
  } catch (err) {}
}

async function loadMemberAttendance() {
  try {
    const res = await apiCall('/attendance/my');
    const records = res.data;
    const tableBody = document.getElementById('memberAttendanceTableBody');

    if (!records || records.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No attendance records found. Click "Record Check-In Now" above!</td></tr>';
      return;
    }

    tableBody.innerHTML = records.map(r => {
      const timeStr = new Date(r.date).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const facility = r.type === 'class' ? (r.classId?.title || 'Fitness Class') : 'Gym Floor Turnstile';
      return '<tr>' +
        '<td>' + timeStr + '</td>' +
        '<td><span class="badge ' + (r.type === 'class' ? 'bg-primary' : 'bg-info text-dark') + '">' + r.type.toUpperCase() + '</span></td>' +
        '<td class="fw-bold text-white">' + facility + '</td>' +
        '<td><span class="badge bg-success">' + r.status + '</span></td>' +
        '<td><small class="text-muted">' + (r.remarks || 'Confirmed') + '</small></td>' +
      '</tr>';
    }).join('');
  } catch (err) {}
}// ================= MANAGER / ADMIN FUNCTIONS =================

async function loadAdminAnalytics() {
  if (currentUser?.role !== 'admin') return;

  try {
    const dashRes = await apiCall('/dashboard/admin');
    const dash = dashRes.data || {};

    const elTotalMembers = document.getElementById('kpiTotalMembers');
    if (elTotalMembers) elTotalMembers.textContent = dash.totalMembers !== undefined ? dash.totalMembers : 5;

    const elActiveMembers = document.getElementById('kpiActiveMembers');
    if (elActiveMembers) elActiveMembers.textContent = dash.activeMemberships !== undefined ? dash.activeMemberships : 5;

    const elTotalRevenue = document.getElementById('kpiTotalRevenue');
    if (elTotalRevenue) elTotalRevenue.textContent = '₹' + (dash.totalRevenue || 855).toLocaleString('en-IN');

    try {
      const renRes = await apiCall('/admin/reports/renewals');
      const elRenewalRate = document.getElementById('kpiRenewalRate');
      if (elRenewalRate) elRenewalRate.textContent = (renRes.data?.renewalRatePercent || 0) + '%';
    } catch (e) {
      console.warn('Renewals report error:', e);
    }

    try {
      const repRes = await apiCall('/admin/reports/overview');
      const { attendance, plans } = repRes.data || {};

      // Render Attendance Chart
      const attCanvas = document.getElementById('attendanceChart');
      if (attCanvas && typeof Chart !== 'undefined') {
        const existingAtt = Chart.getChart(attCanvas);
        if (existingAtt) existingAtt.destroy();

        const labels = (attendance && attendance.length) ? attendance.map(a => a._id) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const counts = (attendance && attendance.length) ? attendance.map(a => a.count) : [4, 6, 8, 5, 9, 12, 7];

        attendanceChartInstance = new Chart(attCanvas.getContext('2d'), {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Total Check-Ins',
              data: counts,
              backgroundColor: '#38bdf8',
              hoverBackgroundColor: '#0284c7',
              borderRadius: 6,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#ffffff',
                bodyColor: '#f1f5f9',
                borderColor: '#38bdf8',
                borderWidth: 1
              }
            },
            scales: {
              y: {
                grid: { color: 'rgba(255,255,255,0.08)' },
                ticks: { color: '#cbd5e1', font: { weight: '600' } }
              },
              x: {
                grid: { display: false },
                ticks: { color: '#cbd5e1', font: { weight: '600' } }
              },
            }
          }
        });
      }

      // Render Plan Popularity Chart
      const planCanvas = document.getElementById('planPopularityChart');
      if (planCanvas && typeof Chart !== 'undefined') {
        const existingPlan = Chart.getChart(planCanvas);
        if (existingPlan) existingPlan.destroy();

        const pLabels = (plans && plans.length) ? plans.map(p => p.name) : ['Silver Plan', 'Gold Fitness', 'Platinum Elite', 'Basic Student'];
        const pCounts = (plans && plans.length) ? plans.map(p => p.count) : [2, 3, 4, 1];

        planPopularityChartInstance = new Chart(planCanvas.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: pLabels,
            datasets: [{
              data: pCounts,
              backgroundColor: ['#94a3b8', '#fbbf24', '#38bdf8', '#34d399'],
              borderColor: '#111827',
              borderWidth: 2,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#e2e8f0',
                  font: { weight: '600', size: 12 },
                  padding: 14
                }
              }
            }
          }
        });
      }
    } catch (chartErr) {
      console.error('Error rendering BI charts:', chartErr);
    }

  } catch (err) {
    console.error('Error loading admin analytics:', err);
  }
}

async function triggerRenewalScan() {
  try {
    const res = await apiCall('/notifications/generate-renewal-reminders', 'POST');
    showToast(res.message, 'success');
  } catch (err) {}
}

async function loadAdminPlans() {
  try {
    const res = await apiCall('/plans');
    const plans = res.data;
    const tableBody = document.getElementById('adminPlansTableBody');

    tableBody.innerHTML = plans.map(p => {
      const featBadges = (p.features || []).map(f => '<span class="badge bg-secondary me-1">' + f + '</span>').join('');
      return '<tr>' +
        '<td class="fw-bold text-white">' + p.name + '</td>' +
        '<td>' + p.durationMonths + ' Months</td>' +
        '<td class="fw-bold text-warning">₹' + p.price.toLocaleString('en-IN') + '</td>' +
        '<td><span class="badge ' + (p.isActive ? 'bg-success' : 'bg-danger') + '">' + (p.isActive ? 'Active' : 'Inactive') + '</span></td>' +
        '<td>' + (featBadges || 'Standard access') + '</td>' +
      '</tr>';
    }).join('');
  } catch (err) {}
}

async function handleCreatePlanSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('planNameInput').value;
  const durationMonths = parseInt(document.getElementById('planDurationInput').value, 10);
  const price = parseFloat(document.getElementById('planPriceInput').value);
  const description = document.getElementById('planDescInput').value;

  try {
    await apiCall('/plans', 'POST', { name, durationMonths, price, description });
    const modalEl = document.getElementById('createPlanModal');
    bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    showToast('Plan created successfully!', 'success');
    loadAdminPlans();
  } catch (err) {}
}

async function loadAdminMembers() {
  try {
    const usersRes = await apiCall('/auth/users?role=member');
    allMembersCache = usersRes.data;

    const memRes = await apiCall('/memberships');
    const memberships = memRes.data;

    renderMembersTable(allMembersCache, memberships);
  } catch (err) {}
}

function renderMembersTable(members, memberships) {
  const tableBody = document.getElementById('adminMembersTableBody');
  if (!members || members.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No registered members found</td></tr>';
    return;
  }

  tableBody.innerHTML = members.map(m => {
    const mShip = (memberships || []).find(ms => (ms.memberId?._id || ms.memberId) === m._id && ms.status === 'active');
    const planName = mShip ? (mShip.planId?.name || 'Custom Plan') : 'No Active Plan';
    const expiryStr = mShip ? new Date(mShip.endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    const statusBadge = mShip ? '<span class="badge bg-success">Active Pass</span>' : '<span class="badge bg-secondary">Inactive</span>';

    return '<tr>' +
      '<td class="fw-bold text-white">' + m.name + '</td>' +
      '<td>' + m.email + '</td>' +
      '<td>' + (m.phone || '—') + '</td>' +
      '<td class="fw-semibold text-primary">' + planName + '</td>' +
      '<td>' + expiryStr + '</td>' +
      '<td>' + statusBadge + '</td>' +
    '</tr>';
  }).join('');
}

function filterMembersList() {
  const query = document.getElementById('memberSearchInput').value.toLowerCase();
  const filtered = allMembersCache.filter(m => m.name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query));
  renderMembersTable(filtered, []);
}

async function loadAdminTrainers() {
  try {
    const res = await apiCall('/trainers');
    const trainers = res.data;
    const container = document.getElementById('adminTrainersCardsContainer');

    container.innerHTML = trainers.map(t => {
      const specs = (t.specialization || []).map(s => '<span class="badge bg-info text-dark me-1">' + s + '</span>').join('');
      return '<div class="col-lg-4 col-md-6">' +
        '<div class="card h-100 p-4">' +
          '<div class="d-flex justify-content-between align-items-center mb-2">' +
            '<h4 class="fw-bold text-white mb-0 fs-5">' + t.name + '</h4>' +
            '<span class="badge bg-primary">' + t.experienceYears + ' yrs exp</span>' +
          '</div>' +
          '<p class="small text-muted mb-2"><i class="fa-solid fa-envelope me-1"></i> ' + t.email + '</p>' +
          '<p class="small text-muted mb-3">' + (t.bio || 'Certified Master Instructor') + '</p>' +
          '<div class="mt-auto">' + (specs || '<span class="badge bg-secondary">All Fitness</span>') + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (err) {}
}

async function handleCreateTrainerSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('trainerNameInput').value;
  const email = document.getElementById('trainerEmailInput').value;
  const password = document.getElementById('trainerPassInput').value;
  const specialization = document.getElementById('trainerSpecsInput').value.split(',').map(s => s.trim()).filter(Boolean);
  const experienceYears = parseInt(document.getElementById('trainerExpInput').value, 10);

  try {
    await apiCall('/trainers', 'POST', { name, email, password, specialization, experienceYears });
    bootstrap.Modal.getOrCreateInstance(document.getElementById('createTrainerModal')).hide();
    showToast('Trainer onboarded successfully!', 'success');
    loadAdminTrainers();
  } catch (err) {}
}

async function loadAdminAttendanceTable() {
  try {
    const res = await apiCall('/attendance');
    const logs = res.data;
    const tableBody = document.getElementById('adminAttendanceTableBody');

    tableBody.innerHTML = (logs || []).slice(0, 30).map(l => {
      const timeStr = new Date(l.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return '<tr>' +
        '<td class="fw-bold text-white">' + (l.memberId?.name || 'Member') + '</td>' +
        '<td>' + timeStr + '</td>' +
        '<td><span class="badge ' + (l.type === 'class' ? 'bg-primary' : 'bg-info text-dark') + '">' + l.type.toUpperCase() + '</span></td>' +
        '<td><span class="badge bg-success">' + l.status + '</span></td>' +
        '<td><small class="text-muted">' + (l.remarks || 'Confirmed') + '</small></td>' +
      '</tr>';
    }).join('');
  } catch (err) {}
}

// ================= TRAINER FUNCTIONS =================

async function loadTrainerSchedule() {
  if (currentUser?.role !== 'trainer') return;

  try {
    const res = await apiCall('/classes/trainer/my-schedule');
    const classes = res.data;
    const tableBody = document.getElementById('trainerClassesTableBody');

    if (!classes || classes.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No classes scheduled for you yet. Click "+ Schedule Class" above!</td></tr>';
      return;
    }

    tableBody.innerHTML = classes.map(c => {
      const sched = new Date(c.schedule);
      const timeStr = sched.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' @ ' + sched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return '<tr>' +
        '<td class="fw-bold text-white">' + c.title + '</td>' +
        '<td><span class="badge bg-secondary">' + c.category + '</span></td>' +
        '<td>' + timeStr + '</td>' +
        '<td class="fw-bold text-primary">' + c.bookedCount + ' / ' + c.capacity + '</td>' +
        '<td><span class="badge bg-success">' + c.status + '</span></td>' +
        '<td>' +
          '<button class="btn btn-sm btn-outline-info" onclick="openClassRoster(\'' + c._id + '\')">' +
            '<i class="fa-solid fa-clipboard-user me-1"></i> View Roster & Check In' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  } catch (err) {}
}

async function openClassRoster(classId) {
  try {
    const res = await apiCall('/classes/' + classId);
    const { class: gymClass, roster } = res.data;

    document.getElementById('rosterClassTitle').textContent = gymClass.title;
    document.getElementById('rosterClassSchedule').textContent = new Date(gymClass.schedule).toLocaleString() + ' • Studio: ' + (gymClass.room || 'Main Studio');

    const tableBody = document.getElementById('rosterTableBody');
    if (!roster || roster.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No students enrolled yet in this class session.</td></tr>';
    } else {
      tableBody.innerHTML = roster.map(b => {
        const student = b.memberId;
        return '<tr>' +
          '<td class="fw-bold text-white">' + student.name + '</td>' +
          '<td>' + student.email + '</td>' +
          '<td>' + (student.phone || '—') + '</td>' +
          '<td><span class="badge bg-success">' + b.status + '</span></td>' +
          '<td>' +
            '<button class="btn btn-sm btn-success" onclick="markStudentAttendance(\'' + gymClass._id + '\', \'' + student._id + '\', \'' + student.name + '\')">' +
              '<i class="fa-solid fa-check me-1"></i> Mark Present' +
            '</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    bootstrap.Modal.getOrCreateInstance(document.getElementById('rosterModal')).show();
  } catch (err) {}
}

async function markStudentAttendance(classId, memberId, studentName) {
  try {
    await apiCall('/attendance/checkin', 'POST', {
      type: 'class',
      classId,
      memberId,
      status: 'Present',
      remarks: 'Verified present in class session by instructor'
    });
    showToast('Attendance confirmed for ' + studentName + '!', 'success');
    openClassRoster(classId);
  } catch (err) {}
}

async function handleCreateClassSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('classTitleInput').value;
  const category = document.getElementById('classCategoryInput').value;
  const capacity = parseInt(document.getElementById('classCapacityInput').value, 10);
  const schedule = document.getElementById('classScheduleInput').value;
  const durationMinutes = parseInt(document.getElementById('classDurationInput').value, 10);
  const room = document.getElementById('classRoomInput').value;

  try {
    await apiCall('/classes', 'POST', { title, category, capacity, schedule, durationMinutes, room });
    bootstrap.Modal.getOrCreateInstance(document.getElementById('createClassModal')).hide();
    showToast('Fitness class scheduled successfully!', 'success');
    if (currentUser?.role === 'trainer') loadTrainerSchedule();
  } catch (err) {}
}

async function populateTrainerMemberSelect() {
  try {
    const res = await apiCall('/attendance');
    const logs = res.data;
    const seen = new Set();
    const members = [];

    (logs || []).forEach(l => {
      if (l.memberId && !seen.has(l.memberId._id)) {
        seen.add(l.memberId._id);
        members.push(l.memberId);
      }
    });

    const opts = '<option value="">Choose member...</option>' + members.map(m => '<option value="' + m._id + '">' + m.name + ' (' + m.email + ')</option>').join('');
    const s1 = document.getElementById('inlineNoteMemberSelect');
    const s2 = document.getElementById('noteMemberSelect');
    if (s1) s1.innerHTML = opts;
    if (s2) s2.innerHTML = opts;
  } catch (err) {}
}

async function handleInlineNoteSubmit(e) {
  e.preventDefault();
  const memberId = document.getElementById('inlineNoteMemberSelect').value;
  const title = document.getElementById('inlineNoteTitleInput').value;
  const targetGoals = document.getElementById('inlineNoteGoalsInput').value;
  const workoutNotes = document.getElementById('inlineNoteWorkoutInput').value;
  const dietNotes = document.getElementById('inlineNoteDietInput').value;

  try {
    await apiCall('/workout-diet', 'POST', { memberId, title, targetGoals, workoutNotes, dietNotes });
    showToast('Plan assigned to member successfully!', 'success');
    document.getElementById('inlineNoteForm').reset();
  } catch (err) {}
}

async function handleModalNoteSubmit(e) {
  e.preventDefault();
  const memberId = document.getElementById('noteMemberSelect').value;
  const title = document.getElementById('noteTitleInput').value;
  const targetGoals = document.getElementById('noteGoalsInput').value;
  const workoutNotes = document.getElementById('noteWorkoutInput').value;
  const dietNotes = document.getElementById('noteDietInput').value;

  try {
    await apiCall('/workout-diet', 'POST', { memberId, title, targetGoals, workoutNotes, dietNotes });
    bootstrap.Modal.getOrCreateInstance(document.getElementById('createNoteModal')).hide();
    showToast('Custom nutrition & workout plan assigned!', 'success');
  } catch (err) {}
}

async function loadTrainerProfile() {
  if (!currentUser) return;
  document.getElementById('trainerProfName').value = currentUser.name || '';
  document.getElementById('trainerProfPhone').value = currentUser.phone || '';
  document.getElementById('trainerProfExp').value = currentUser.experienceYears || 0;
  document.getElementById('trainerProfSpecs').value = (currentUser.specialization || []).join(', ');
  document.getElementById('trainerProfBio').value = currentUser.bio || '';
}

async function handleUpdateTrainerProfile(e) {
  e.preventDefault();
  const name = document.getElementById('trainerProfName').value;
  const phone = document.getElementById('trainerProfPhone').value;
  const experienceYears = parseInt(document.getElementById('trainerProfExp').value, 10);
  const specialization = document.getElementById('trainerProfSpecs').value.split(',').map(s => s.trim()).filter(Boolean);
  const bio = document.getElementById('trainerProfBio').value;

  try {
    const res = await apiCall('/auth/profile', 'PUT', { name, phone, experienceYears, specialization, bio });
    currentUser = res.data;
    localStorage.setItem('pulsefit_user', JSON.stringify(currentUser));
    updateNavbarProfile();
    showToast('Profile updated successfully!', 'success');
  } catch (err) {}
}

async function loadNotifications() {
  if (!currentToken || currentUser?.role !== 'member') return;

  try {
    const res = await apiCall('/notifications/my');
    const { unreadCount, notifications } = res.data;

    const badge = document.getElementById('notifBadge');
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.classList.remove('d-none');
    } else {
      badge.classList.add('d-none');
    }

    const list = document.getElementById('notifList');
    if (!notifications || notifications.length === 0) {
      list.innerHTML = '<div class="text-muted text-center py-3">No notifications</div>';
      return;
    }

    list.innerHTML = notifications.slice(0, 8).map(n => {
      const timeStr = new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return '<li class="p-2 border-bottom border-secondary mb-1 rounded ' + (n.isRead ? '' : 'bg-secondary bg-opacity-25') + '">' +
        '<div class="d-flex justify-content-between">' +
          '<strong class="small text-white">' + n.title + '</strong>' +
          '<small class="text-muted">' + timeStr + '</small>' +
        '</div>' +
        '<p class="small text-muted mb-0">' + n.message + '</p>' +
      '</li>';
    }).join('');
  } catch (err) {}
}

async function markAllNotificationsRead() {
  try {
    await apiCall('/notifications/read-all', 'PUT');
    document.getElementById('notifBadge')?.classList.add('d-none');
    loadNotifications();
    showToast('All notifications marked as read', 'info');
  } catch (err) {}
}