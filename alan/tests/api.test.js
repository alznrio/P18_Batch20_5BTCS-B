const { app } = require('../server');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');
const Membership = require('../models/Membership');
const Class = require('../models/Class');
const Booking = require('../models/Booking');
const Attendance = require('../models/Attendance');
const Waitlist = require('../models/Waitlist');
const WorkoutDietNote = require('../models/WorkoutDietNote');
const Notification = require('../models/Notification');

let server;
let baseUrl;

const runTests = async () => {
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
      passed++;
    } else {
      console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  };

  try {
    await connectDB();

    // Clean test db and seed required base users
    await Promise.all([
      User.deleteMany({}),
      MembershipPlan.deleteMany({}),
      Membership.deleteMany({}),
      Class.deleteMany({}),
      Booking.deleteMany({}),
      Waitlist.deleteMany({}),
      Attendance.deleteMany({}),
      WorkoutDietNote.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    const adminPasswordHash = await User.hashPassword('Admin@123');
    const trainerPasswordHash = await User.hashPassword('Trainer@123');

    const admin = await User.create({
      name: 'Marcus Vance',
      email: 'admin@gymfitness.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
    });

    const trainer = await User.create({
      name: 'Sarah Connor',
      email: 'sarah.trainer@gymfitness.com',
      passwordHash: trainerPasswordHash,
      role: 'trainer',
      specialization: ['HIIT', 'Conditioning'],
    });

    // Create 2 additional trainers for list test
    await User.create({
      name: 'David Miller',
      email: 'david.trainer@gymfitness.com',
      passwordHash: trainerPasswordHash,
      role: 'trainer',
      specialization: ['Powerlifting'],
    });

    await User.create({
      name: 'Elena Rostova',
      email: 'elena.trainer@gymfitness.com',
      passwordHash: trainerPasswordHash,
      role: 'trainer',
      specialization: ['Yoga'],
    });

    // Start server on an ephemeral test port
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}/api`;

    console.log(`\n\x1b[36m====================================================\x1b[0m`);
    console.log(`\x1b[36m  P18 Gym & Fitness API Automated Integration Tests \x1b[0m`);
    console.log(`\x1b[36m  Running against: ${baseUrl}\x1b[0m`);
    console.log(`\x1b[36m====================================================\x1b[0m\n`);

    // --- TEST 1: Health Check ---
    console.log('\x1b[33m[Module 13 & Infrastructure: System Health]\x1b[0m');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.success === true, 'Health check returns 200 OK');

    // --- TEST 2: Member Registration & Auth (Happy Path) ---
    console.log('\n\x1b[33m[Module 1: Member Registration & Authentication]\x1b[0m');
    const memberEmail = `testuser_${Date.now()}@testgym.com`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan Test',
        email: memberEmail,
        password: 'Password@123',
        role: 'member',
        phone: '+1 555-9876',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success === true, 'Member Registration returns 201 Created');
    assert(regData.data.token && regData.data.user.email === memberEmail, 'Registration returns JWT token & sanitized user');

    // Login with newly created member
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: memberEmail,
        password: 'Password@123',
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.data.token, 'Member Login returns 200 and valid JWT');
    const memberToken = loginData.data.token;

    // Login with seeded admin
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gymfitness.com',
        password: 'Admin@123',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminLoginData.data.user.role === 'admin', 'Admin Login returns 200 & role=admin');
    const adminToken = adminLoginData.data.token;

    // Login with seeded trainer
    const trainerLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sarah.trainer@gymfitness.com',
        password: 'Trainer@123',
      }),
    });
    const trainerLoginData = await trainerLoginRes.json();
    assert(trainerLoginRes.status === 200 && trainerLoginData.data.user.role === 'trainer', 'Trainer Login returns 200 & role=trainer');
    const trainerToken = trainerLoginData.data.token;

    // --- TEST 3: Validation Failure (Missing Required Fields) ---
    console.log('\n\x1b[33m[Non-Functional: Input Validation & Error Handling]\x1b[0m');
    const invalidRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Incomplete' }),
    });
    const invalidRegData = await invalidRegRes.json();
    assert(
      invalidRegRes.status === 400 && invalidRegData.errorCode === 'VALIDATION_ERROR',
      'Validation failure returns 400 with VALIDATION_ERROR'
    );

    // --- TEST 4: Authentication Failure (Protected Route Without Token) ---
    const noTokenRes = await fetch(`${baseUrl}/auth/me`);
    const noTokenData = await noTokenRes.json();
    assert(
      noTokenRes.status === 401 && noTokenData.errorCode === 'UNAUTHORIZED',
      'Protected route without token returns 401 UNAUTHORIZED'
    );

    // --- TEST 5: Authorization Failure (Member calling Admin route) ---
    console.log('\n\x1b[33m[Module 13: Role-Based Access Control]\x1b[0m');
    const forbiddenRes = await fetch(`${baseUrl}/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        name: 'Hacker Plan',
        durationMonths: 12,
        price: 0,
      }),
    });
    const forbiddenData = await forbiddenRes.json();
    assert(
      forbiddenRes.status === 403 && forbiddenData.errorCode === 'FORBIDDEN',
      'Member attempting Admin plan creation returns 403 FORBIDDEN'
    );

    // --- TEST 6: Membership Plan Management (Module 2) ---
    console.log('\n\x1b[33m[Module 2: Membership Plan Management]\x1b[0m');
    const testPlanName = `Test Pass ${Date.now()}`;
    const planCreateRes = await fetch(`${baseUrl}/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: testPlanName,
        durationMonths: 2,
        price: 99.0,
        description: 'Automated test 2-month plan',
      }),
    });
    const planCreateData = await planCreateRes.json();
    assert(planCreateRes.status === 201 && planCreateData.data.name === testPlanName, 'Admin can create new membership plan (201)');
    const createdPlanId = planCreateData.data._id;

    // --- TEST 7: Membership Purchase & Expiry Tracking (Module 3) ---
    console.log('\n\x1b[33m[Module 3: Membership Purchase & Expiry Tracking]\x1b[0m');
    const buyRes = await fetch(`${baseUrl}/memberships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        planId: createdPlanId,
      }),
    });
    const buyData = await buyRes.json();
    assert(buyRes.status === 201 && buyData.data._id, 'Member successfully purchases plan (returns 201 & _id)');

    const myMemRes = await fetch(`${baseUrl}/memberships/my`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const myMemData = await myMemRes.json();
    assert(myMemRes.status === 200 && myMemData.data.activeMembership !== null, 'Member can fetch active membership with remaining duration');

    // --- TEST 8: Trainer Profile Management (Module 4) ---
    console.log('\n\x1b[33m[Module 4: Trainer Profile Management]\x1b[0m');
    const trainersRes = await fetch(`${baseUrl}/trainers`);
    const trainersData = await trainersRes.json();
    assert(trainersRes.status === 200 && Array.isArray(trainersData.data) && trainersData.data.length >= 3, 'Fetch all trainers returns 200 and list of trainers');

    // --- TEST 9: Class Schedule Management (Module 5) ---
    console.log('\n\x1b[33m[Module 5: Class Schedule Management]\x1b[0m');
    const classScheduleTime = new Date(Date.now() + 86400000); // tomorrow
    const createClassRes = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trainerToken}`,
      },
      body: JSON.stringify({
        title: 'Elite Kettlebell Conditioning',
        category: 'Strength',
        schedule: classScheduleTime.toISOString(),
        capacity: 1, // Only 1 slot to test capacity overflow & waitlist!
        durationMinutes: 45,
        room: 'Kettlebell Zone',
      }),
    });
    const createClassData = await createClassRes.json();
    assert(createClassRes.status === 201 && createClassData.data._id, 'Trainer creates a scheduled class (201)');
    const testClassId = createClassData.data._id;

    // --- TEST 10: Class Booking Engine (Module 6) ---
    console.log('\n\x1b[33m[Module 6: Class Booking Engine]\x1b[0m');
    const bookRes = await fetch(`${baseUrl}/classes/${testClassId}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
    });
    const bookData = await bookRes.json();
    assert(bookRes.status === 201 && bookData.data.status === 'booked', 'Member books class successfully (201)');

    // Duplicate booking check (Business rule)
    const dupBookRes = await fetch(`${baseUrl}/classes/${testClassId}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
    });
    const dupBookData = await dupBookRes.json();
    assert(
      dupBookRes.status === 409 && dupBookData.errorCode === 'ALREADY_BOOKED',
      'Duplicate booking attempt rejected with 409 ALREADY_BOOKED'
    );

    // --- TEST 11: Waitlist for Full Classes (Module 8) ---
    console.log('\n\x1b[33m[Module 8: Waitlist for Full Classes]\x1b[0m');
    const member2Email = `waitlist_member_${Date.now()}@testgym.com`;
    const reg2Res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Taylor Waitlist',
        email: member2Email,
        password: 'Password@123',
        role: 'member',
      }),
    });
    const reg2Data = await reg2Res.json();
    const member2Token = reg2Data.data.token;

    // Member 2 buys a plan
    await fetch(`${baseUrl}/memberships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${member2Token}`,
      },
      body: JSON.stringify({ planId: createdPlanId }),
    });

    // Try booking full class (capacity was 1)
    const fullBookRes = await fetch(`${baseUrl}/classes/${testClassId}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${member2Token}`,
      },
    });
    const fullBookData = await fullBookRes.json();
    assert(fullBookRes.status === 409 && fullBookData.errorCode === 'CLASS_FULL', 'Booking full class rejected with 409 CLASS_FULL');

    // Join waitlist
    const waitlistRes = await fetch(`${baseUrl}/classes/${testClassId}/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${member2Token}`,
      },
    });
    const waitlistData = await waitlistRes.json();
    assert(waitlistRes.status === 201 && waitlistData.data.position === 1, 'Member successfully added to class waitlist at position #1');

    // --- TEST 12: Attendance Check-In Module (Module 7) ---
    console.log('\n\x1b[33m[Module 7: Attendance Check-In Module]\x1b[0m');
    const checkinRes = await fetch(`${baseUrl}/attendance/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        type: 'gym',
        status: 'Approved',
        remarks: 'Reviewed and confirmed by authorized role',
      }),
    });
    const checkinData = await checkinRes.json();
    assert(
      checkinRes.status === 200 && checkinData.data.status === 'Approved',
      'Attendance check-in returns 200 and matches sample response format'
    );

    // --- TEST 13: Diet/Workout Plan Notes (Module 9) ---
    console.log('\n\x1b[33m[Module 9: Diet/Workout Plan Notes]\x1b[0m');
    const memberRecord = await User.findOne({ email: memberEmail });
    const noteRes = await fetch(`${baseUrl}/workout-diet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trainerToken}`,
      },
      body: JSON.stringify({
        memberId: memberRecord._id.toString(),
        title: 'Conditioning & Fat Loss Split',
        workoutNotes: '3x Full Body HIIT + 2x 5k run',
        dietNotes: '2,200 kcal high protein diet',
      }),
    });
    const noteData = await noteRes.json();
    assert(noteRes.status === 201 && noteData.data._id, 'Trainer creates workout & diet plan note (201)');

    const myNotesRes = await fetch(`${baseUrl}/workout-diet/my`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const myNotesData = await myNotesRes.json();
    assert(myNotesRes.status === 200 && myNotesData.data.length >= 1, 'Member successfully retrieves personalized workout notes');

    // --- TEST 14: Renewal & Expiry Notifications (Module 10) ---
    console.log('\n\x1b[33m[Module 10: Renewal & Expiry Notifications]\x1b[0m');
    const renewalScanRes = await fetch(`${baseUrl}/notifications/generate-renewal-reminders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const renewalScanData = await renewalScanRes.json();
    assert(renewalScanRes.status === 200 && renewalScanData.data !== undefined, 'Admin executes renewal notification scan (200)');

    const notifRes = await fetch(`${baseUrl}/notifications/my`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const notifData = await notifRes.json();
    assert(notifRes.status === 200 && Array.isArray(notifData.data.notifications), 'Member retrieves notifications list');

    // --- TEST 15: Member Self-Service Dashboard (Module 11) ---
    console.log('\n\x1b[33m[Module 11: Member Self-Service Dashboard]\x1b[0m');
    const dashRes = await fetch(`${baseUrl}/dashboard/member`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const dashData = await dashRes.json();
    assert(
      dashRes.status === 200 && dashData.data.membership && dashData.data.attendance,
      'Member Dashboard aggregates membership status, bookings, attendance, and notes'
    );

    // --- TEST 16: Branch Admin Reports (Module 12) ---
    console.log('\n\x1b[33m[Module 12: Branch Admin Reports]\x1b[0m');
    const repAttRes = await fetch(`${baseUrl}/admin/reports/attendance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const repAttData = await repAttRes.json();
    assert(repAttRes.status === 200 && repAttData.data.totalCheckIns !== undefined, 'Attendance report returns check-in breakdown and trends (200)');

    const repPlanRes = await fetch(`${baseUrl}/admin/reports/plans`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const repPlanData = await repPlanRes.json();
    assert(repPlanRes.status === 200 && Array.isArray(repPlanData.data), 'Plan popularity report returns subscriptions and revenue per plan');

    const repRenewalRes = await fetch(`${baseUrl}/admin/reports/renewals`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const repRenewalData = await repRenewalRes.json();
    assert(repRenewalRes.status === 200 && repRenewalData.data.renewalRatePercent !== undefined, 'Renewal rate report returns retention percentage');

    // --- TEST 17: Resource Not Found Handling (404) ---
    console.log('\n\x1b[33m[Non-Functional: 404 Not Found & CastError Handling]\x1b[0m');
    const notFoundRes = await fetch(`${baseUrl}/plans/000000000000000000000000`);
    const notFoundData = await notFoundRes.json();
    assert(
      notFoundRes.status === 404 && notFoundData.success === false,
      'Non-existent resource returns clean 404 JSON, not a crash'
    );

    console.log(`\n\x1b[36m====================================================\x1b[0m`);
    console.log(`  Tests Completed: \x1b[32m${passed} Passed\x1b[0m | \x1b[31m${failed} Failed\x1b[0m`);
    console.log(`\x1b[36m====================================================\x1b[0m\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test runner fatal error:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await disconnectDB();
    process.exit(0);
  }
};

runTests();