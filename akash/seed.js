const mongoose = require('mongoose');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

const User = require('./models/User');
const MembershipPlan = require('./models/MembershipPlan');
const Membership = require('./models/Membership');
const Class = require('./models/Class');
const Booking = require('./models/Booking');
const Waitlist = require('./models/Waitlist');
const Attendance = require('./models/Attendance');
const WorkoutDietNote = require('./models/WorkoutDietNote');
const Notification = require('./models/Notification');
const { addMonths } = require('./utils/dateHelpers');

const seedDatabase = async (disconnectAfter = true) => {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    console.log('[Seed] Connected to database. Clearing old collections...');

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

    console.log('[Seed] Seeding Users...');
    const adminPasswordHash = await User.hashPassword('Admin@123');
    const trainerPasswordHash = await User.hashPassword('Trainer@123');
    const memberPasswordHash = await User.hashPassword('Member@123');

    // 1. Users
    const admin = await User.create({
      name: 'Marcus Vance (Branch Admin)',
      email: 'admin@gymfitness.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      phone: '+1 (555) 100-2000',
      bio: 'Regional Gym Director overseeing branch operations, trainers, and revenue management.',
    });

    const trainerSarah = await User.create({
      name: 'Sarah Connor',
      email: 'sarah.trainer@gymfitness.com',
      passwordHash: trainerPasswordHash,
      role: 'trainer',
      phone: '+1 (555) 200-3001',
      specialization: ['HIIT & MetCon', 'Cardiovascular Endurance', 'Fat Loss Conditioning'],
      bio: 'Certified master trainer with 6 years experience running high-tempo interval bootcamps.',
      experienceYears: 6,
    });

    const trainerDavid = await User.create({
      name: 'David Miller',
      email: 'david.trainer@gymfitness.com',
      passwordHash: trainerPasswordHash,
      role: 'trainer',
      phone: '+1 (555) 200-3002',
      specialization: ['Powerlifting', 'Strength & Hypertrophy', 'Functional Movement'],
      bio: 'Former national powerlifter coaching biomechanically sound squat, bench, and deadlift technique.',
      experienceYears: 8,
    });

    const trainerElena = await User.create({
      name: 'Elena Rostova',
      email: 'elena.trainer@gymfitness.com',
      passwordHash: trainerPasswordHash,
      role: 'trainer',
      phone: '+1 (555) 200-3003',
      specialization: ['Ashtanga & Vinyasa Yoga', 'Pilates', 'Core Rehabilitation'],
      bio: 'RYT-500 registered yoga and mobility specialist focusing on recovery, breathwork, and posture.',
      experienceYears: 5,
    });

    const memberAlex = await User.create({
      name: 'Alex Mercer',
      email: 'alex.member@gymfitness.com',
      passwordHash: memberPasswordHash,
      role: 'member',
      phone: '+1 (555) 300-4001',
      emergencyContact: 'Karen Mercer (+1 555-900-1111)',
    });

    const memberJohn = await User.create({
      name: 'John Doe',
      email: 'john.doe@gymfitness.com',
      passwordHash: memberPasswordHash,
      role: 'member',
      phone: '+1 (555) 300-4002',
      emergencyContact: 'Mary Doe (+1 555-900-2222)',
    });

    const memberPriya = await User.create({
      name: 'Priya Patel',
      email: 'priya.patel@gymfitness.com',
      passwordHash: memberPasswordHash,
      role: 'member',
      phone: '+1 (555) 300-4003',
      emergencyContact: 'Raj Patel (+1 555-900-3333)',
    });

    const memberMichael = await User.create({
      name: 'Michael Scott',
      email: 'michael.scott@gymfitness.com',
      passwordHash: memberPasswordHash,
      role: 'member',
      phone: '+1 (555) 300-4004',
      emergencyContact: 'Dwight Schrute (+1 555-900-4444)',
    });

    console.log('[Seed] Seeding Membership Plans...');
    // 2. Plans
    const planSilver = await MembershipPlan.create({
      name: 'Quarterly Silver',
      durationMonths: 3,
      price: 129.0,
      description: 'Access to general gym floor, cardio zone, and 2 group classes per week.',
      features: ['Full Gym Floor Access', 'Locker Room & Showers', '2 Group Classes / Week'],
      isActive: true,
    });

    const planGold = await MembershipPlan.create({
      name: 'Half-Yearly Gold',
      durationMonths: 6,
      price: 229.0,
      description: 'Comprehensive fitness plan with unlimited classes, sauna, and diet review.',
      features: ['Unlimited Gym Floor Access', 'Unlimited Fitness Classes', 'Sauna & Steam Bath', 'Monthly Trainer Check-in'],
      isActive: true,
    });

    const planPlatinum = await MembershipPlan.create({
      name: 'Annual Platinum VIP',
      durationMonths: 12,
      price: 399.0,
      description: 'All-inclusive VIP membership with dedicated trainer consultation, guest passes, and custom diet plans.',
      features: ['All Gym Access 24/7', 'VIP Priority Class Booking', 'Free Guest Pass Monthly', 'Custom Workout & Diet Plans'],
      isActive: true,
    });

    const planMonthly = await MembershipPlan.create({
      name: 'Monthly Kickstart',
      durationMonths: 1,
      price: 49.0,
      description: 'Flexible monthly gym pass with no long-term commitment.',
      features: ['Standard Gym Floor Access', 'Locker Room Access'],
      isActive: true,
    });

    console.log('[Seed] Seeding Memberships...');
    // 3. Memberships
    // Active membership for Alex (Platinum)
    const now = new Date();
    const alexMembership = await Membership.create({
      memberId: memberAlex._id,
      planId: planPlatinum._id,
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000), // ~11 months remaining
      status: 'active',
      amountPaid: 399.0,
      autoRenewal: true,
    });

    // Active membership for John (Gold)
    const johnMembership = await Membership.create({
      memberId: memberJohn._id,
      planId: planGold._id,
      startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 165 * 24 * 60 * 60 * 1000),
      status: 'active',
      amountPaid: 229.0,
      autoRenewal: false,
    });

    // Active membership for Priya (Silver)
    const priyaMembership = await Membership.create({
      memberId: memberPriya._id,
      planId: planSilver._id,
      startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 80 * 24 * 60 * 60 * 1000),
      status: 'active',
      amountPaid: 129.0,
      autoRenewal: false,
    });

    // Expiring soon membership for Michael Scott (expiring in 3 days) to demonstrate Renewal notifications!
    const michaelMembership = await Membership.create({
      memberId: memberMichael._id,
      planId: planMonthly._id,
      startDate: new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days remaining!
      status: 'active',
      amountPaid: 49.0,
      autoRenewal: false,
    });

    console.log('[Seed] Seeding Classes...');
    // 4. Classes
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const classYoga = await Class.create({
      trainerId: trainerElena._id,
      title: 'Sunrise Vinyasa Flow',
      description: 'Invigorating morning sequence aligning breath and mindful movement to build core stability.',
      category: 'Yoga',
      schedule: new Date(tomorrow.setHours(7, 30, 0, 0)),
      durationMinutes: 60,
      capacity: 15,
      bookedCount: 1,
      room: 'Zen Studio A',
      status: 'scheduled',
    });

    const classHIIT = await Class.create({
      trainerId: trainerSarah._id,
      title: 'High-Octane HIIT Surge',
      description: 'Maximum calorie burn with tabata intervals, sled pushes, battle ropes, and kettlebells.',
      category: 'HIIT',
      schedule: new Date(tomorrow.setHours(17, 30, 0, 0)),
      durationMinutes: 45,
      capacity: 12,
      bookedCount: 2,
      room: 'Functional Arena',
      status: 'scheduled',
    });

    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const classPower = await Class.create({
      trainerId: trainerDavid._id,
      title: 'Barbell Strength & Deadlift Clinic',
      description: 'Master compound lifting mechanics with tailored coach cues, bar paths, and accessory work.',
      category: 'Strength',
      schedule: new Date(dayAfter.setHours(18, 0, 0, 0)),
      durationMinutes: 75,
      capacity: 8,
      bookedCount: 1,
      room: 'Olympic Lifting Pit',
      status: 'scheduled',
    });

    // Class intentionally filled to capacity (capacity: 2, bookedCount: 2) to demonstrate Waitlist
    const classSpin = await Class.create({
      trainerId: trainerSarah._id,
      title: 'Cadence & Rhythm Spin Fest',
      description: 'Intense rhythm cycling with climb intervals and heart-rate zone surges.',
      category: 'Spinning',
      schedule: new Date(dayAfter.setHours(19, 30, 0, 0)),
      durationMinutes: 50,
      capacity: 2,
      bookedCount: 2,
      waitlistCount: 1,
      room: 'Spinning Studio 2',
      status: 'scheduled',
    });

    console.log('[Seed] Seeding Bookings & Waitlist...');
    // 5. Bookings
    await Booking.create({
      classId: classYoga._id,
      memberId: memberPriya._id,
      status: 'booked',
    });

    await Booking.create({
      classId: classHIIT._id,
      memberId: memberAlex._id,
      status: 'booked',
    });

    await Booking.create({
      classId: classHIIT._id,
      memberId: memberJohn._id,
      status: 'booked',
    });

    await Booking.create({
      classId: classPower._id,
      memberId: memberAlex._id,
      status: 'booked',
    });

    // 2 bookings filling the Spin class
    await Booking.create({
      classId: classSpin._id,
      memberId: memberAlex._id,
      status: 'booked',
    });

    await Booking.create({
      classId: classSpin._id,
      memberId: memberJohn._id,
      status: 'booked',
    });

    // 1 waitlist for Priya on the full Spin class
    await Waitlist.create({
      classId: classSpin._id,
      memberId: memberPriya._id,
      position: 1,
      status: 'waiting',
    });

    console.log('[Seed] Seeding Attendance...');
    // 6. Attendance (Past week history)
    for (let i = 6; i >= 0; i--) {
      const logDate = new Date(now);
      logDate.setDate(logDate.getDate() - i);
      logDate.setHours(9, 15, 0, 0);

      await Attendance.create({
        memberId: memberAlex._id,
        date: logDate,
        type: 'gym',
        status: 'Approved',
        remarks: 'Front desk barcode scan confirmed',
        markedBy: admin._id,
      });

      if (i % 2 === 0) {
        const classDate = new Date(now);
        classDate.setDate(classDate.getDate() - i);
        classDate.setHours(18, 0, 0, 0);

        await Attendance.create({
          memberId: memberJohn._id,
          date: classDate,
          type: 'class',
          classId: classHIIT._id,
          status: 'Present',
          remarks: 'Completed 45 min HIIT session',
          markedBy: trainerSarah._id,
        });
      }
    }

    console.log('[Seed] Seeding Workout & Diet Plans...');
    // 7. Workout & Diet Plans
    await WorkoutDietNote.create({
      memberId: memberAlex._id,
      trainerId: trainerDavid._id,
      title: 'Hypertrophy & Posterior Chain Protocol (Phase 1)',
      targetGoals: 'Increase deadlift 1RM by 15kg while maintaining 12% bodyfat',
      workoutNotes: 'Mon: Heavy Squat (4x5) + Bulgarian Split Squat (3x10). Wed: Bench Press (5x5) + Weighted Dips (3x8). Fri: Conventional Deadlift (3x5) + Barbell Rows (4x8). Rest 2-3 mins between heavy sets.',
      dietNotes: 'Caloric target: 2,750 kcal/day. 180g Protein (Whey isolate, chicken breast, eggs), 320g Carbs (oats, jasmine rice, sweet potatoes), 75g healthy fats (avocado, olive oil, almonds). Hydration: 4L water daily.',
    });

    await WorkoutDietNote.create({
      memberId: memberPriya._id,
      trainerId: trainerElena._id,
      title: 'Mobility, Core Stability & Plant-Based Energy',
      targetGoals: 'Improve hip internal rotation, relieve lower back tightness, boost aerobic stamina',
      workoutNotes: 'Daily 15-min morning mobility flow (Cat-cow, world greatest stretch, 90-90 hip transitions). 3x/week Vinyasa Yoga + 2x/week Zone 2 cardio (30 mins stationary bike at 130 bpm).',
      dietNotes: 'Clean Mediterranean plant-forward diet: Lentil dahls, quinoa bowls with roasted chickpeas, pumpkin seeds, berry antioxidant smoothies with plant protein. 1,900 kcal/day with 110g protein.',
    });

    console.log('[Seed] Seeding Notifications...');
    // 8. Notifications
    await Notification.create({
      memberId: memberAlex._id,
      title: 'Welcome to Gym & Fitness Club!',
      message: 'Your Annual Platinum VIP membership is active. Enjoy unlimited access and VIP class reservations.',
      type: 'general',
      isRead: true,
    });

    await Notification.create({
      memberId: memberAlex._id,
      title: 'Booking Confirmed: High-Octane HIIT Surge',
      message: `Your spot is reserved for tomorrow at 5:30 PM with Sarah Connor.`,
      type: 'booking',
      isRead: false,
    });

    await Notification.create({
      memberId: memberPriya._id,
      title: 'Waitlist Position Confirmed (#1)',
      message: 'You are #1 on the waitlist for Cadence & Rhythm Spin Fest. You will be automatically booked if a slot opens!',
      type: 'waitlist',
      isRead: false,
    });

    await Notification.create({
      memberId: memberMichael._id,
      title: 'Membership Expiring in 3 Days!',
      message: 'Your Monthly Kickstart pass expires in 3 days. Renew now to avoid interruption in gym entry.',
      type: 'renewal',
      isRead: false,
    });

    console.log('====================================================');
    console.log('  Database seeded successfully with rich demo data! ');
    console.log('  Demo Accounts:');
    console.log('    Branch Admin : admin@gymfitness.com       / Admin@123');
    console.log('    Trainer 1    : sarah.trainer@gymfitness.com / Trainer@123');
    console.log('    Trainer 2    : david.trainer@gymfitness.com / Trainer@123');
    console.log('    Member 1     : alex.member@gymfitness.com   / Member@123');
    console.log('    Member 2     : john.doe@gymfitness.com      / Member@123');
    console.log('    Member 3     : priya.patel@gymfitness.com   / Member@123');
    console.log('    Member 4     : michael.scott@gymfitness.com / Member@123 (Expiring)');
    console.log('====================================================');

    if (disconnectAfter) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (err) {
    console.error('[Seed Error]:', err);
    if (disconnectAfter) process.exit(1);
    throw err;
  }
};

if (require.main === module) {
  seedDatabase(true);
}

module.exports = { seedDatabase };