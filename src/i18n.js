import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
} from 'react'

export const translations = {
  en: {
    'app.title': 'Exam Seat Plan',
    'app.subtitle': 'Automatic room seating',
    'lang.switchTo': 'বাংলা',
    'lang.en': 'English',
    'lang.bn': 'বাংলা',
    'nav.setup': 'Setup',
    'nav.plan': 'Seat Plan',
    'nav.search': 'Search',
    'nav.exams': 'Exams',
    'nav.print': 'Print',
    'page.setup.title': 'Setup',
    'page.setup.text': 'Paste rooms and students here, then generate the seat plan.',
    'page.plan.title': 'Seat Plan',
    'page.plan.text': 'Each room will be shown as a grid, with broken seats greyed out.',
    'page.search.title': 'Search',
    'page.search.text': 'Look up a student ID to see their room and seat.',
    'page.comingSoon': 'Coming soon',
    'footer.note': 'Data is stored only in your browser (localStorage).',
    'data.rooms': 'Rooms',
    'data.students': 'Students',
    'reset.button': 'Reset sample data',
    'reset.confirm':
      'Reset all rooms and students back to the sample data? This cannot be undone.',
    'reset.confirmYes': 'Yes, reset',
    'reset.confirmNo': 'Cancel',

    // Setup page
    'setup.institution.title': 'Institution',
    'setup.institution.name': 'Institution name',
    'setup.institution.logo': 'Institution logo',
    'setup.institution.logoChoose': 'Choose logo',
    'setup.institution.logoRemove': 'Remove logo',
    'setup.institution.language': 'App language',
    'setup.exam.title': 'Exam',
    'setup.exam.id': 'Exam ID',
    'setup.exam.name': 'Title',
    'setup.exam.date': 'Date',
    'setup.exam.start': 'Start time',
    'setup.exam.end': 'End time',
    'setup.rooms.title': 'Rooms',
    'setup.rooms.size': 'Size',
    'setup.rooms.bench': 'Seats per bench',
    'setup.rooms.broken': 'Broken',
    'setup.backup.title': 'Backup',
    'setup.backup.export': 'Export backup (JSON)',
    'setup.backup.import': 'Import backup',
    'setup.backup.hint':
      'All data lives in this browser only. Export a backup before clearing browser data.',

    // Shared
    'common.none': 'None',
    'data.seats': 'Usable seats',
    'reset.done': 'Sample data restored.',

    // Import / logo errors
    'import.ok': 'Backup imported successfully.',
    'import.error.bad-json': 'That file is not valid JSON.',
    'import.error.not-object': 'That file is not a seat plan backup.',
    'import.error.bad-version':
      'This backup was created by a newer version of the app.',
    'import.error.too-large': 'That file is too large (limit 5 MB).',
    'import.error.read': 'The file could not be read.',
    'logo.error.not-image': 'Please choose an image file.',
    'logo.error.too-large': 'Logo is too large (limit 150 KB).',
    'logo.error.read': 'The image could not be read.',

    // Data import
    'import.title': 'Import data',
    'import.subtitle':
      'Import rooms and students from a CSV or Excel file, or paste the text.',
    'import.chooseFile': 'Choose CSV or Excel file',
    'import.paste': 'Paste CSV text',
    'import.readPaste': 'Read pasted text',
    'import.template': 'Download sample template',
    'import.mapping': 'Column mapping',
    'import.notMapped': 'Not mapped',
    'import.required': 'Required',
    'import.optional': 'Optional',
    'import.checkOnly': 'Checked only',
    'import.validate': 'Check data',
    'import.apply': 'Import accepted rows',
    'import.accepted': 'Accepted',
    'import.rejected': 'Rejected',
    'import.warnings': 'Warnings',
    'import.rowsRead': 'Rows read',
    'import.noIssues': 'No problems found.',
    'import.downloadErrors': 'Download error CSV',
    'import.done': 'Import finished.',
    'import.file': 'File',
    'import.field.id': 'Student ID',
    'import.field.name': 'Student name',
    'import.field.course': 'Course',
    'import.field.department': 'Department',
    'import.field.section': 'Section',
    'import.field.room': 'Room (check only)',
    'import.field.roomName': 'Room name',
    'import.field.rows': 'Rows',
    'import.field.cols': 'Columns',
    'import.field.building': 'Building',
    'import.field.seatsPerBench': 'Seats per bench',
    'import.field.brokenSeats': 'Broken seats',
    'import.reason.blank': 'Blank row',
    'import.reason.missing': 'Missing value',
    'import.reason.duplicate': 'Duplicate value',
    'import.reason.unknown-room': 'Unknown room',
    'import.error.no-headers': 'No column headings were found.',
    'import.error.encoding':
      'This file is not valid UTF-8. Please save it as UTF-8 CSV and try again.',
    'import.error.sheetjs':
      'The Excel reader could not be loaded. Check your internet connection, or use CSV instead.',
    'import.error.no-table': 'Choose a file or paste some text first.',

    // Seat plan
    'plan.options': 'Constraints',
    'plan.opt.sideBySide': 'No same course side by side (left / right)',
    'plan.opt.frontBack': 'No same course front / back',
    'plan.opt.department': 'No same department in any adjacent seat',
    'plan.opt.skipBenches': 'Leave alternate benches empty',
    'plan.opt.skipColumns': 'Leave alternate columns empty',
    'plan.opt.departmentNote': 'Department is checked in all four directions.',
    'plan.order': 'Fill order',
    'plan.order.roll': 'Roll order',
    'plan.order.shuffle': 'Shuffle',
    'plan.seed': 'Shuffle seed',
    'plan.generate': 'Generate plan',
    'plan.regenerate': 'Regenerate',
    'plan.score': 'Constraint score',
    'plan.score.checks': 'Adjacent seat pairs checked',
    'plan.score.satisfied': 'Pairs satisfied',
    'plan.attempts': 'Attempts',
    'plan.utilization': 'Seat utilization',
    'plan.seated': 'Seated',
    'plan.capacity': 'Capacity',
    'plan.unseated': 'Unseated students',
    'plan.violations': 'Violated constraints',
    'plan.noViolations': 'All enabled constraints are satisfied.',
    'plan.legend': 'Courses',
    'plan.seat': 'Seat',
    'plan.needsPlan': 'Generate a plan to see the room grids.',
    'plan.arrow': 'next to',
    'plan.direction.left': 'left',
    'plan.direction.right': 'right',
    'plan.direction.front': 'front',
    'plan.direction.back': 'back',
    'plan.rule.courseSide': 'Same course side by side',
    'plan.rule.courseFrontBack': 'Same course front / back',
    'plan.rule.department': 'Same department adjacent',
    'plan.cell.broken': 'Broken seat',
    'plan.cell.skipped': 'Left empty',
    'plan.cell.free': 'Empty seat',

    // Exams & calendar
    'exams.title': 'Exams',
    'exams.selector': 'Exam',
    'exams.add': 'New exam',
    'exams.duplicate': 'Duplicate',
    'exams.copySuffix': 'copy',
    'exams.delete': 'Delete',
    'exams.deleteConfirm':
      'Delete this exam and its seat plan? This cannot be undone.',
    'exams.deleteYes': 'Yes, delete',
    'exams.deleteNo': 'Cancel',
    'exams.calendar': 'Calendar',
    'exams.prevMonth': 'Previous month',
    'exams.nextMonth': 'Next month',
    'exams.today': 'Today',
    'exams.none': 'No exams yet.',
    'exams.roomConflicts': 'Rooms booked twice',
    'exams.noRoomConflicts':
      'No room is booked twice in overlapping time slots.',
    'exams.studentConflicts': 'Students in two exams at once',
    'exams.noStudentConflicts':
      'No student is in two exams at the same time.',
    'exams.clashesWith': 'clashes with',
    'exams.roster': 'Students in this exam',
    'exams.slot': 'Slot',
    'exams.noDate': 'No date set',
    'exams.weekdays': 'Sun Mon Tue Wed Thu Fri Sat',
    'data.exams': 'Exams',
    'plan.blockedRooms': 'Rooms blocked by an overlapping exam',

    // Print & export
    'print.title': 'Print & export',
    'print.document': 'Document',
    'print.doc.grid': 'Room seat grid',
    'print.doc.door': 'Door sheet',
    'print.doc.attendance': 'Attendance sheet',
    'print.doc.slips': 'Admit cards',
    'print.room': 'Room',
    'print.allRooms': 'All rooms',
    'print.print': 'Print',
    'print.savePdf': 'Save as PDF',
    'print.pdfHint':
      'In the print dialog choose "Save as PDF" as the destination to keep a digital copy.',
    'print.exportCsv': 'Export plan CSV',
    'print.noPlan': 'Generate a seat plan first, then come back to print.',
    'print.invigilator': 'Invigilator signature',
    'print.chiefInvigilator': 'Chief invigilator',
    'print.date': 'Date',
    'print.roll': 'Roll',
    'print.name': 'Name',
    'print.course': 'Course',
    'print.signature': 'Signature',
    'print.total': 'Total',
    'print.attendanceNote': 'Please sign in the last column on entry.',
    'print.slipsHint': 'Eight admit cards are printed on each A4 page.',

    // Invigilators
    'invigilators.title': 'Invigilators',
    'invigilators.name': 'Name',
    'invigilators.phone': 'Phone',
    'invigilators.department': 'Department',
    'invigilators.add': 'Add invigilator',
    'invigilators.remove': 'Remove',
    'invigilators.perRoom': 'Invigilators per room',
    'invigilators.autoAssign': 'Auto-assign',
    'invigilators.staffed': 'Rooms staffed',
    'invigilators.short': 'rooms still need an invigilator',
    'invigilators.busy': 'Already assigned to another room in this slot',
    'invigilators.none': 'No invigilators yet.',

    // Manual plan editing
    'edit.title': 'Manual editing',
    'edit.hint':
      'Drag a student onto another seat, or click one seat and then another, to swap them.',
    'edit.lock': 'Lock seat',
    'edit.unlock': 'Unlock seat',
    'edit.locked': 'Locked seat',
    'edit.undo': 'Undo',
    'edit.redo': 'Redo',
    'edit.absent': 'Mark absent',
    'edit.present': 'Mark present again',
    'edit.special': 'Needs a front seat',
    'edit.normal': 'No front seat needed',
    'edit.clearSelection': 'Cancel selection',
    'edit.selected': 'Selected seat',
    'edit.lockedNote':
      'Locked seats keep their student when the plan is regenerated.',
    'edit.flags': 'Flags',
    'edit.absentCount': 'Absent',
    'edit.specialCount': 'Need front seat',

    // Fallbacks, exported column headings and crash messages
    'app.untitled': 'Untitled',
    'invigilators.unnamed': 'Unnamed',
    'sample.institution': 'Example University',
    'sample.examMid': 'Mid Term Examination',
    'sample.examPractical': 'Practical Examination',
    'csv.row': 'Row',
    'csv.severity': 'Severity',
    'csv.reason': 'Reason',
    'csv.field': 'Field',
    'csv.value': 'Value',
    'csv.note': 'Note',
    'csv.institution': 'Institution',
    'csv.examId': 'Exam ID',
    'csv.examTitle': 'Exam title',
    'csv.examDate': 'Exam date',
    'csv.startTime': 'Start time',
    'csv.endTime': 'End time',
    'csv.studentId': 'Student ID',
    'csv.name': 'Name',
    'csv.course': 'Course',
    'csv.department': 'Department',
    'csv.section': 'Section',
    'csv.room': 'Room',
    'csv.roomName': 'Room name',
    'csv.building': 'Building',
    'csv.rows': 'Rows',
    'csv.cols': 'Columns',
    'csv.seatsPerBench': 'Seats per bench',
    'csv.brokenSeats': 'Broken seats',
    'csv.status': 'Status',
    'csv.seated': 'Seated',
    'csv.unseated': 'Unseated',
    'import.severity.error': 'Error',
    'import.severity.warning': 'Warning',
    'error.title': 'Something went wrong',
    'error.body':
      'The app ran into an unexpected problem. Reload the page to try again.',
    'error.reload': 'Reload',
    'error.details': 'Technical details',

    // Search
    'search.title': 'Find a student',
    'search.placeholder': 'Student ID or part of a name',
    'search.scope': 'Search in',
    'search.scope.current': 'Current exam only',
    'search.scope.all': 'All exams',
    'search.found': 'students found',
    'search.noResult': 'No student found',
    'search.hint': 'Start typing a student ID or a name.',
    'search.tip.id': 'Search by student ID, for example 241-15-1001.',
    'search.tip.name':
      'Part of a name works too, written in Bangla or English.',
    'search.tip.digits':
      'Bangla and English digits match each other: ১২৩ finds 123.',
    'search.tip.spaces': 'Extra spaces are ignored.',
    'search.noPlan': 'No seat plan has been generated for this exam yet.',
    'search.unseated': 'Unseated — no seat was assigned.',
    'search.printSlip': 'Print slip',
    'search.slipTitle': 'Admit card',
    'search.id': 'ID',
    'search.building': 'Building',
    'search.bench': 'Bench',

    // Theme, demo data, first-run wizard and generic states
    'theme.toggle': 'Dark mode',
    'demo.title': 'Demo data',
    'demo.load': 'Load demo data',
    'demo.body':
      'Replaces everything with 3 rooms and 26 students so you can try the app.',
    'wizard.title': 'Welcome',
    'wizard.step': 'Step',
    'wizard.institution': 'Tell us about your institution',
    'wizard.institutionBody': 'This name appears on every printed sheet.',
    'wizard.rooms': 'Add your rooms',
    'wizard.roomsBody':
      'Import a rooms file, or load the demo data to look around.',
    'wizard.students': 'Add your students',
    'wizard.studentsBody':
      'Import a student list, or load the demo data to look around.',
    'wizard.generate': 'Generate the seat plan',
    'wizard.generateBody':
      'Students are seated automatically, keeping same-course students apart.',
    'wizard.back': 'Back',
    'wizard.next': 'Next',
    'wizard.finish': 'Finish',
    'wizard.skip': 'Skip for now',
    'wizard.saved':
      'Setup complete. Generate a seat plan to see the rooms.',
    'state.loading': 'Working…',
    'state.noRooms': 'No rooms yet.',
    'state.noStudents': 'No students yet.',
    'state.error': 'Something went wrong. Please try again.',
    'state.corrupt.title': 'Saved data could not be read',
    'state.corrupt.body':
      'The data stored in this browser was damaged, so the app started again with sample data. Import a backup if you have one.',
    'state.corrupt.dismiss': 'OK',
    'privacy.title': 'Your data stays in this browser',
    'privacy.body':
      'Everything is saved in this browser only. Nothing is uploaded, there is no server and no account. Clearing site data or using a private window erases it.',
  },
  bn: {
    'app.title': 'পরীক্ষার সিট প্ল্যান',
    'app.subtitle': 'স্বয়ংক্রিয় কক্ষ বিন্যাস',
    'lang.switchTo': 'English',
    'lang.en': 'English',
    'lang.bn': 'বাংলা',
    'nav.setup': 'সেটআপ',
    'nav.plan': 'সিট প্ল্যান',
    'nav.search': 'খোঁজ',
    'nav.exams': 'পরীক্ষাসমূহ',
    'nav.print': 'প্রিন্ট',
    'page.setup.title': 'সেটআপ',
    'page.setup.text': 'এখানে কক্ষ ও শিক্ষার্থীদের তথ্য পেস্ট করুন, তারপর সিট প্ল্যান তৈরি করুন।',
    'page.plan.title': 'সিট প্ল্যান',
    'page.plan.text': 'প্রতিটি কক্ষ গ্রিড আকারে দেখানো হবে, নষ্ট সিট ধূসর রঙে থাকবে।',
    'page.search.title': 'শিক্ষার্থী খোঁজ',
    'page.search.text': 'আইডি দিয়ে শিক্ষার্থীর কক্ষ ও সিট দেখুন।',
    'page.comingSoon': 'শীঘ্রই আসছে',
    'footer.note': 'ডেটা শুধু আপনার ব্রাউজারে (localStorage) সংরক্ষিত থাকে।',
    'data.rooms': 'কক্ষ',
    'data.students': 'শিক্ষার্থী',
    'reset.button': 'নমুনা ডেটা রিসেট',
    'reset.confirm': 'সব কক্ষ ও শিক্ষার্থীকে নমুনা ডেটায় ফিরিয়ে নিতে চান? এটি ফিরিয়ে আনা যাবে না।',
    'reset.confirmYes': 'হ্যাঁ, রিসেট করুন',
    'reset.confirmNo': 'বাতিল',

    // Setup page
    'setup.institution.title': 'প্রতিষ্ঠান',
    'setup.institution.name': 'প্রতিষ্ঠানের নাম',
    'setup.institution.logo': 'প্রতিষ্ঠানের লোগো',
    'setup.institution.logoChoose': 'লোগো নির্বাচন করুন',
    'setup.institution.logoRemove': 'লোগো সরান',
    'setup.institution.language': 'অ্যাপের ভাষা',
    'setup.exam.title': 'পরীক্ষা',
    'setup.exam.id': 'পরীক্ষা আইডি',
    'setup.exam.name': 'শিরোনাম',
    'setup.exam.date': 'তারিখ',
    'setup.exam.start': 'শুরুর সময়',
    'setup.exam.end': 'শেষের সময়',
    'setup.rooms.title': 'কক্ষসমূহ',
    'setup.rooms.size': 'আকার',
    'setup.rooms.bench': 'বেঞ্চে আসন',
    'setup.rooms.broken': 'নষ্ট',
    'setup.backup.title': 'ব্যাকআপ',
    'setup.backup.export': 'ব্যাকআপ এক্সপোর্ট (JSON)',
    'setup.backup.import': 'ব্যাকআপ ইমপোর্ট',
    'setup.backup.hint':
      'সব ডেটা শুধু এই ব্রাউজারে থাকে। ব্রাউজারের ডেটা মুছে ফেলার আগে ব্যাকআপ নিন।',

    // Shared
    'common.none': 'নেই',
    'data.seats': 'ব্যবহারযোগ্য আসন',
    'reset.done': 'নমুনা ডেটা পুনরুদ্ধার হয়েছে।',

    // Import / logo errors
    'import.ok': 'ব্যাকআপ সফলভাবে আমদানি হয়েছে।',
    'import.error.bad-json': 'ফাইলটি বৈধ JSON নয়।',
    'import.error.not-object': 'ফাইলটি সিট প্ল্যান ব্যাকআপ নয়।',
    'import.error.bad-version': 'এই ব্যাকআপটি অ্যাপের নতুন সংস্করণে তৈরি হয়েছে।',
    'import.error.too-large': 'ফাইলটি অনেক বড় (সর্বোচ্চ ৫ মেগাবাইট)।',
    'import.error.read': 'ফাইলটি পড়া যায়নি।',
    'logo.error.not-image': 'একটি ছবির ফাইল নির্বাচন করুন।',
    'logo.error.too-large': 'লোগো অনেক বড় (সর্বোচ্চ ১৫০ কিলোবাইট)।',
    'logo.error.read': 'ছবিটি পড়া যায়নি।',

    // Data import
    'import.title': 'ডেটা ইমপোর্ট',
    'import.subtitle':
      'CSV বা এক্সেল ফাইল থেকে কক্ষ ও শিক্ষার্থী ইমপোর্ট করুন, অথবা টেক্সট পেস্ট করুন।',
    'import.chooseFile': 'CSV বা এক্সেল ফাইল নির্বাচন করুন',
    'import.paste': 'CSV টেক্সট পেস্ট করুন',
    'import.readPaste': 'পেস্ট করা টেক্সট পড়ুন',
    'import.template': 'নমুনা টেমপ্লেট ডাউনলোড করুন',
    'import.mapping': 'কলাম ম্যাপিং',
    'import.notMapped': 'ম্যাপ করা হয়নি',
    'import.required': 'আবশ্যক',
    'import.optional': 'ঐচ্ছিক',
    'import.checkOnly': 'শুধু যাচাই হবে',
    'import.validate': 'ডেটা যাচাই করুন',
    'import.apply': 'গৃহীত সারি ইমপোর্ট করুন',
    'import.accepted': 'গৃহীত',
    'import.rejected': 'বাতিল',
    'import.warnings': 'সতর্কতা',
    'import.rowsRead': 'পঠিত সারি',
    'import.noIssues': 'কোনো সমস্যা পাওয়া যায়নি।',
    'import.downloadErrors': 'এরর CSV ডাউনলোড করুন',
    'import.done': 'ইমপোর্ট সম্পন্ন হয়েছে।',
    'import.file': 'ফাইল',
    'import.field.id': 'শিক্ষার্থী আইডি',
    'import.field.name': 'শিক্ষার্থীর নাম',
    'import.field.course': 'কোর্স',
    'import.field.department': 'বিভাগ',
    'import.field.section': 'শেষ',
    'import.field.room': 'কক্ষ (শুধু যাচাই)',
    'import.field.roomName': 'কক্ষের নাম',
    'import.field.rows': 'সারি',
    'import.field.cols': 'কলাম',
    'import.field.building': 'ভবন',
    'import.field.seatsPerBench': 'বেঞ্চে আসন',
    'import.field.brokenSeats': 'নষ্ট আসন',
    'import.reason.blank': 'ফাঁকা সারি',
    'import.reason.missing': 'মান অনুপস্থিত',
    'import.reason.duplicate': 'সদৃশ মান',
    'import.reason.unknown-room': 'অজানা কক্ষ',
    'import.error.no-headers': 'কোনো কলাম শিরোনাম পাওয়া যায়নি।',
    'import.error.encoding':
      'এই ফাইলটি বৈধ UTF-8 নয়। অনুগ্রহ করে UTF-8 CSV হিসেবে সংরক্ষণ করে আবার চেষ্টা করুন।',
    'import.error.sheetjs':
      'এক্সেল রিডার লোড করা যায়নি। ইন্টারনেট সংযোগ দেখুন, অথবা CSV ব্যবহার করুন।',
    'import.error.no-table': 'প্রথমে একটি ফাইল নির্বাচন করুন বা টেক্সট পেস্ট করুন।',

    // Seat plan
    'plan.options': 'নিয়মাবলি',
    'plan.opt.sideBySide': 'পাশাপাশি একই কোর্স নয় (বাম / ডান)',
    'plan.opt.frontBack': 'সামনে-পেছনে একই কোর্স নয়',
    'plan.opt.department': 'পাশের কোনো আসনেও একই বিভাগ নয়',
    'plan.opt.skipBenches': 'প্রতি বিকল্প বেঞ্চ ফাঁকা রাখুন',
    'plan.opt.skipColumns': 'প্রতি বিকল্প কলাম ফাঁকা রাখুন',
    'plan.opt.departmentNote': 'বিভাগ চার দিকেই যাচাই করা হয়।',
    'plan.order': 'বসার ক্রম',
    'plan.order.roll': 'রোল ক্রম',
    'plan.order.shuffle': 'শাফল',
    'plan.seed': 'শাফল সিড',
    'plan.generate': 'প্ল্যান তৈরি করুন',
    'plan.regenerate': 'পুনরায় তৈরি করুন',
    'plan.score': 'নিয়ম মানার হার',
    'plan.score.checks': 'পরীক্ষিত পাশাপাশি আসন',
    'plan.score.satisfied': 'মানা পড়েছে',
    'plan.attempts': 'চেষ্টা',
    'plan.utilization': 'আসন ব্যবহার',
    'plan.seated': 'বসানো হয়েছে',
    'plan.capacity': 'আসন সংখ্যা',
    'plan.unseated': 'আসন পাওয়া যায়নি',
    'plan.violations': 'ভঙ্গ নিয়ম',
    'plan.noViolations': 'সব নিয়ম মানা হয়েছে।',
    'plan.legend': 'কোর্সসমূহ',
    'plan.seat': 'আসন',
    'plan.needsPlan': 'কক্ষের গ্রিড দেখতে সিট প্ল্যান তৈরি করুন।',
    'plan.arrow': 'পাশে',
    'plan.direction.left': 'বামে',
    'plan.direction.right': 'ডানে',
    'plan.direction.front': 'সামনে',
    'plan.direction.back': 'পেছনে',
    'plan.rule.courseSide': 'পাশাপাশি একই কোর্স',
    'plan.rule.courseFrontBack': 'সামনে-পেছনে একই কোর্স',
    'plan.rule.department': 'পাশাপাশি একই বিভাগ',
    'plan.cell.broken': 'নষ্ট আসন',
    'plan.cell.skipped': 'ফাঁকা রাখা হয়েছে',
    'plan.cell.free': 'ফাঁকা আসন',

    // Exams & calendar
    'exams.title': 'পরীক্ষাসমূহ',
    'exams.selector': 'পরীক্ষা',
    'exams.add': 'নতুন পরীক্ষা',
    'exams.duplicate': 'অনুলিপি',
    'exams.copySuffix': 'অনুলিপি',
    'exams.delete': 'মুছুন',
    'exams.deleteConfirm': 'এই পরীক্ষা ও এর সিট প্ল্যান মুছে ফেলবেন? এটি ফেরানো যাবে না।',
    'exams.deleteYes': 'হ্যাঁ, মুছুন',
    'exams.deleteNo': 'বাতিল',
    'exams.calendar': 'ক্যালেন্ডার',
    'exams.prevMonth': 'আগের মাস',
    'exams.nextMonth': 'পরের মাস',
    'exams.today': 'আজ',
    'exams.none': 'এখনও কোনো পরীক্ষা যুক্ত করা হয়নি।',
    'exams.roomConflicts': 'একই কক্ষ দুই পরীক্ষায়',
    'exams.noRoomConflicts': 'সময়সংঘর্ষে কোনো কক্ষ দুইবার ব্যবহৃত হয়নি।',
    'exams.studentConflicts': 'একসঙ্গে দুই পরীক্ষায় শিক্ষার্থী',
    'exams.noStudentConflicts': 'একই সময়ে কোনো শিক্ষার্থী দুই পরীক্ষায় নেই।',
    'exams.clashesWith': 'সংঘর্ষ করে',
    'exams.roster': 'এই পরীক্ষার শিক্ষার্থী',
    'exams.slot': 'সময়',
    'exams.noDate': 'তারিখ নির্ধারণ করা হয়নি',
    'exams.weekdays': 'রবি সোম মঙ্গল বুধ বৃহ শুক্র শনি',
    'data.exams': 'পরীক্ষা',
    'plan.blockedRooms': 'সময়সংঘর্ষের কারণে বন্ধ কক্ষ',

    // Print & export
    'print.title': 'প্রিন্ট ও এক্সপোর্ট',
    'print.document': 'ডকুমেন্ট',
    'print.doc.grid': 'কক্ষের আসনের গ্রিড',
    'print.doc.door': 'ডোর শিট',
    'print.doc.attendance': 'উপস্থিতি শিট',
    'print.doc.slips': 'অ্যাডমিট কার্ড',
    'print.room': 'কক্ষ',
    'print.allRooms': 'সব কক্ষ',
    'print.print': 'প্রিন্ট',
    'print.savePdf': 'PDF হিসেবে সংরক্ষণ',
    'print.pdfHint':
      'ডিজিটাল কপি রাখতে প্রিন্ট ডায়ালগে গন্তব্য হিসেবে "Save as PDF" বেছে নিন।',
    'print.exportCsv': 'প্ল্যান CSV এক্সপোর্ট',
    'print.noPlan': 'প্রথমে একটি সিট প্ল্যান তৈরি করুন, তারপর প্রিন্ট করুন।',
    'print.invigilator': 'পরিদর্শকের স্বাক্ষর',
    'print.chiefInvigilator': 'প্রধান পরিদর্শক',
    'print.date': 'তারিখ',
    'print.roll': 'রোল',
    'print.name': 'নাম',
    'print.course': 'কোর্স',
    'print.signature': 'স্বাক্ষর',
    'print.total': 'মোট',
    'print.attendanceNote': 'উপস্থিতির সময় শেষ কলামে স্বাক্ষর দিন।',
    'print.slipsHint': 'প্রতি A4 পাতায় আটটি অ্যাডমিট কার্ড মুদ্রিত হয়।',

    // Invigilators
    'invigilators.title': 'পরিদর্শক',
    'invigilators.name': 'নাম',
    'invigilators.phone': 'ফোন',
    'invigilators.department': 'বিভাগ',
    'invigilators.add': 'পরিদর্শক যোগ করুন',
    'invigilators.remove': 'সরান',
    'invigilators.perRoom': 'প্রতি কক্ষে পরিদর্শক',
    'invigilators.autoAssign': 'স্বয়ংক্রিয় বরাদ্দ',
    'invigilators.staffed': 'পরিদর্শক নিয়োগিত কক্ষ',
    'invigilators.short': 'কক্ষে পরিদর্শক প্রয়োজন',
    'invigilators.busy': 'এই সময়ে অন্য কক্ষে নিয়োগিত',
    'invigilators.none': 'এখনও কোনো পরিদর্শক যোগ করা হয়নি।',

    // Manual plan editing
    'edit.title': 'হাতে সম্পাদনা',
    'edit.hint':
      'একজন শিক্ষার্থীকে অন্য আসনে টেনে আনুন, অথবা একটি আসনে ক্লিক করে অন্যটিতে ক্লিক করে জায়গা বদলান।',
    'edit.lock': 'আসন লক করুন',
    'edit.unlock': 'আসন আনলক করুন',
    'edit.locked': 'লক করা আসন',
    'edit.undo': 'পূর্বাবস্থা',
    'edit.redo': 'পুনরাবস্থা',
    'edit.absent': 'অনুপস্থিত চিহ্নিত করুন',
    'edit.present': 'আবার উপস্থিত চিহ্নিত করুন',
    'edit.special': 'সামনের আসন প্রয়োজন',
    'edit.normal': 'সামনের আসন লাগবে না',
    'edit.clearSelection': 'নির্বাচন বাতিল',
    'edit.selected': 'নির্বাচিত আসন',
    'edit.lockedNote': 'প্ল্যান পুনরায় তৈরি হলে লক করা আসনের শিক্ষার্থী অপরিবর্তিত থাকে।',
    'edit.flags': 'চিহ্ন',
    'edit.absentCount': 'অনুপস্থিত',
    'edit.specialCount': 'সামনের আসন প্রয়োজন',

    // Fallbacks, exported column headings and crash messages
    'app.untitled': 'শিরোনামহীন',
    'invigilators.unnamed': 'নামহীন',
    'sample.institution': 'উদাহরণ বিশ্ববিদ্যালয়',
    'sample.examMid': 'মধ্যপরীক্ষা',
    'sample.examPractical': 'ব্যবহারিক পরীক্ষা',
    'csv.row': 'সারি',
    'csv.severity': 'তীব্রতা',
    'csv.reason': 'কারণ',
    'csv.field': 'ফিল্ড',
    'csv.value': 'মান',
    'csv.note': 'নোট',
    'csv.institution': 'প্রতিষ্ঠান',
    'csv.examId': 'পরীক্ষা আইডি',
    'csv.examTitle': 'পরীক্ষার শিরোনাম',
    'csv.examDate': 'পরীক্ষার তারিখ',
    'csv.startTime': 'শুরুর সময়',
    'csv.endTime': 'শেষের সময়',
    'csv.studentId': 'শিক্ষার্থী আইডি',
    'csv.name': 'নাম',
    'csv.course': 'কোর্স',
    'csv.department': 'বিভাগ',
    'csv.section': 'শেষ',
    'csv.room': 'কক্ষ',
    'csv.roomName': 'কক্ষের নাম',
    'csv.building': 'ভবন',
    'csv.rows': 'সারি',
    'csv.cols': 'কলাম',
    'csv.seatsPerBench': 'বেঞ্চে আসন',
    'csv.brokenSeats': 'নষ্ট আসন',
    'csv.status': 'অবস্থা',
    'csv.seated': 'বসানো হয়েছে',
    'csv.unseated': 'বসানো হয়নি',
    'import.severity.error': 'ত্রুটি',
    'import.severity.warning': 'সতর্কতা',
    'error.title': 'কিছু একটা ভুল হয়েছে',
    'error.body':
      'অ্যাপটিতে অপ্রত্যাশিত সমস্যা হয়েছে। আবার চেষ্টা করতে পেজটি রিওলোড করুন।',
    'error.reload': 'রিওলোড',
    'error.details': 'প্রযুক্তিগত বিবরণ',

    // Search
    'search.title': 'শিক্ষার্থী খুঁজুন',
    'search.placeholder': 'আইডি বা নামের অংশ',
    'search.scope': 'যেখানে খুঁজবেন',
    'search.scope.current': 'শুধু বর্তমান পরীক্ষা',
    'search.scope.all': 'সব পরীক্ষা',
    'search.found': 'জন শিক্ষার্থী পাওয়া গেছে',
    'search.noResult': 'কোনো শিক্ষার্থী পাওয়া যায়নি',
    'search.hint': 'শিক্ষার্থীর আইডি বা নাম লিখতে শুরু করুন।',
    'search.tip.id': 'শিক্ষার্থী আইডি দিয়ে খুঁজুন, যেমন ২৪১-১৫-১০০১।',
    'search.tip.name': 'নামের যেকোনো অংশ দিয়েও খুঁজা যায়, বাংলা বা ইংরেজি—দুটোতেই।',
    'search.tip.digits':
      'বাংলা ও ইংরেজি সংখ্যা একে অপরের সমান ধরা হয়: ১২৩ দিয়ে 123 পাওয়া যাবে।',
    'search.tip.spaces': 'অতিরিক্ত ফাঁকা জায়গা উপেক্ষা করা হয়।',
    'search.noPlan': 'এই পরীক্ষার সিট প্ল্যান এখনও তৈরি করা হয়নি।',
    'search.unseated': 'আসন পাওয়া যায়নি — কোনো আসন বরাদ্দ দেওয়া হয়নি।',
    'search.printSlip': 'পত্রক মুদ্রণ',
    'search.slipTitle': 'প্রবেশপত্র',
    'search.id': 'আইডি',
    'search.building': 'ভবন',
    'search.bench': 'বেঞ্চ',

    // Theme, demo data, first-run wizard and generic states
    'theme.toggle': 'ডার্ক মোড',
    'demo.title': 'ডেমো ডেটা',
    'demo.load': 'ডেমো ডেটা লোড করুন',
    'demo.body':
      'অ্যাপটি দেখার জন্য ৩টি কক্ষ ও ২৬ জন শিক্ষার্থী দিয়ে সবকিছু প্রতিস্থাপন করে।',
    'wizard.title': 'স্বাগতম',
    'wizard.step': 'ধাপ',
    'wizard.institution': 'প্রতিষ্ঠান সম্পর্কে জানান',
    'wizard.institutionBody': 'এই নামটি মুদ্রিত প্রতিটি পত্রে থাকবে।',
    'wizard.rooms': 'কক্ষ যোগ করুন',
    'wizard.roomsBody': 'কক্ষের ফাইল ইমপোর্ট করুন, অথবা ডেমো ডেটা লোড করুন।',
    'wizard.students': 'শিক্ষার্থী যোগ করুন',
    'wizard.studentsBody':
      'শিক্ষার্থীর তালিকা ইমপোর্ট করুন, অথবা ডেমো ডেটা লোড করুন।',
    'wizard.generate': 'সিট প্ল্যান তৈরি করুন',
    'wizard.generateBody':
      'একই কোর্সের শিক্ষার্থীদের আলাদা রেখে স্বয়ংক্রিয়ভাবে আসন বরাদ্দ করা হবে।',
    'wizard.back': 'পেছনে',
    'wizard.next': 'পরবর্তী',
    'wizard.finish': 'শেষ',
    'wizard.skip': 'এখনই এড়িয়ে যান',
    'wizard.saved': 'সেটআপ সম্পন্ন। কক্ষ দেখতে সিট প্ল্যান তৈরি করুন।',
    'state.loading': 'কাজ চলছে…',
    'state.noRooms': 'এখনও কোনো কক্ষ নেই।',
    'state.noStudents': 'এখনও কোনো শিক্ষার্থী নেই।',
    'state.error': 'কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।',
    'state.corrupt.title': 'সংরক্ষিত ডেটা পড়া যায়নি',
    'state.corrupt.body':
      'এই ব্রাউজারে সংরক্ষিত ডেটা ক্ষতিগ্রস্ত ছিল, তাই অ্যাপটি নমুনা ডেটা দিয়ে নতুন করে শুরু করেছে। ব্যাকআপ থাকলে ইমপোর্ট করুন।',
    'state.corrupt.dismiss': 'ঠিক আছে',
    'privacy.title': 'আপনার ডেটা এই ব্রাউজারেই থাকে',
    'privacy.body':
      'সবকিছু শুধু এই ব্রাউজারে সংরক্ষিত হয়। কোনো কিছু আপলোড হয় না, কোনো সার্ভার বা অ্যাকাউন্ট নেই। সাইট ডেটা মুছলে বা প্রাইভেট উইন্ডোতে সব মুছে যাবে।',
  },
}

const LANG_KEY = 'seatplan.lang'
const THEME_KEY = 'seatplan.theme'

const LANGS = ['en', 'bn']
const THEMES = ['light', 'dark']

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯'

export const LOCALES = { en: 'en-US', bn: 'bn-BD' }

const LangContext = createContext(null)

function readStored(key, allowed, fallback) {
  try {
    const saved = localStorage.getItem(key)
    if (allowed.includes(saved)) return saved
  } catch {
    // ignore storage errors (private mode, disabled storage)
  }
  return fallback
}

// The language already saved in the browser, used when seeding sample data.
export function storedLang() {
  return readStored(LANG_KEY, LANGS, 'en')
}

/** 123 -> "১২৩" when Bangla digits are on. */
export function localiseDigits(value, digits) {
  const text = String(value ?? '')
  if (digits !== 'beng') return text
  return text.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)])
}

/** "2026-05-12" -> "May 12, 2026" / "১২ মে, ২০২৬" */
export function formatDate(value, lang, digits) {
  if (!value) return ''
  const parts = String(value).split('-').map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return localiseDigits(value, digits)
  }
  // built from parts, so the day never shifts with the machine time zone
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  if (Number.isNaN(date.getTime())) return localiseDigits(value, digits)
  try {
    return new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.en, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      numberingSystem: digits === 'beng' ? 'beng' : 'latn',
    }).format(date)
  } catch {
    return localiseDigits(value, digits)
  }
}

/** "09:30" -> "০৯:৩০" when Bangla digits are on. */
export function formatTime(value, digits) {
  if (!value) return ''
  const parts = String(value).split(':').map(Number)
  if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) {
    return localiseDigits(value, digits)
  }
  return localiseDigits(
    `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`,
    digits,
  )
}

const warned = new Set()

// t() must never return undefined: fall back to English, then to the key, and
// warn once per missing key so the console points at the gap.
function lookup(lang, key) {
  const table = translations[lang] || translations.en
  const value = table[key] ?? translations.en[key]
  if (typeof value !== 'string' || value.trim() === '') {
    if (!warned.has(key)) {
      warned.add(key)
      console.warn(
        `[i18n] Missing translation for "${key}" (lang: ${lang}); showing the key.`,
      )
    }
    return key
  }
  return value
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => storedLang())
  // Digits follow the language: Bangla always uses Bangla digits, English Latin.
  const digits = lang === 'bn' ? 'beng' : 'latn'
  const [theme, setTheme] = useState(() => readStored(THEME_KEY, THEMES, 'light'))

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      // ignore storage errors
    }
    document.documentElement.lang = lang
    document.documentElement.dataset.digits = digits
    // the document title follows the chosen language
    document.title = translations[lang]['app.title']
  }, [lang, digits])

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore storage errors
    }
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const t = (key) => lookup(lang, key)
  // n() renders a number, d() a date and time() a clock time - all in the
  // currently chosen language and digit system.
  const n = (value) => localiseDigits(value, digits)
  const d = (value) => formatDate(value, lang, digits)
  const time = (value) => formatTime(value, digits)

  const toggle = () => setLang((current) => (current === 'en' ? 'bn' : 'en'))
  const toggleTheme = () =>
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))

  const value = {
    lang,
    setLang,
    toggle,
    digits,
    theme,
    toggleTheme,
    locale: LOCALES[lang],
    t,
    n,
    d,
    time,
  }
  return createElement(LangContext.Provider, { value }, children)
}

export function useLang() {
  const context = useContext(LangContext)
  if (!context) {
    throw new Error('useLang must be used inside <LangProvider>')
  }
  return context
}
