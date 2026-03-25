## 1. Dashboard Page
- A main section, visible in navigation section.
- Gives quick navigation to pages.
- Page is for everyone, ceo, centre_head, teacher, accountant.

## 2. Approval Page
- A main section visible in navigation section.
- Shows pending, rejected and approved approvals.
- Page is for ceo and centre_head. ceo can view all the requests, centre_head will only see requests for his specific centre.

## 3. Analytics Page
- A main section visible in navigation section, holds all the pages having analytics involved.
### a) Attendance Analysis
- Visible to ceo, centre_head and teacher. A filter at the top for filtering the students. Teacher can view students of their own batches, centre_head can view students/batches of his centre, ceo can see all the students/batches/centres.
- It has day wise and month wise attendance viusalization. It has total break down pie chart/donut chart. It has yearly bar graph which has monthwise bars, traced by a line. It has KPI cards. Bar graph has filter for present, absent and both.
- Batch, Students, months, year, etc. are the filters available. The flexibility is between viewing student or batch or centre attendance against custom dates range.
- Explicit filter will be for yearly attendance which will show that bar + line graph for selected student/students in filter.
- Individual student stats table at the bottom showing individual student attendance in table, useful when batch/centre is selected. Filter for present, absent, all.

### b) Performance Analysis
- Visible to ceo, centre_head and teacher. A filter at the top for filtering the students. Teacher can view students of their own batches, centre_head can view students/batches of his centre, ceo can see all the students/batches.
- It has filter for batch, student, subject. Centre wise filter shouldn't be provided as the subjects differ across batches. Bar + Line graph traces student performance, overall and subject wise.
- A detailed table showing individual students marks for each subject present at the bottom of the page, useful when group of students are selected and we need to view individual student performance in detail.
- Comparison will be both rank wise and consistency wise.

### c) Staff Attendance Analysis
- Visible to ceo, centre_head and teacher. A filter at the top for filtering the teacher. Teacher can view only his attendance stats, so he won't have filter for filtering the batches and centres. centre_head can view teachers/batches of his centre, ceo can see all the teachers/batches/centres.
- Apart from what attendance analysis for student had, the teachers have 3 categories of attendance, present, absent and partial. When attendance is partial, the entry and exit time is provided.
- It has day wise and month wise attendance viusalization. It has total break down pie chart/donut chart. It has yearly bar graph which has monthwise bars, traced by a line. It has KPI cards. Bar graph has filter for present, absent and partial, all 3 together.
- Centres, Batch, teachers, months, year, etc. are the filters available. The flexibility is between viewing a teacher or batch or centre attendance against custom dates range.
- Explicit filter will be for yearly attendance which will show that bar + line graph for selected teacher/centre/batch in filter.
- Individual teacher stats table at the bottom showing individual teacher attendance in table, useful when batch/centre is selected. Filter for partial, present, all and absent.

### d) Financials Analysis
- Visible to ceo, accountant and centre_head.
- ceo can view all centres, accountant and centre_head can view only for his center.
- Filter for time range (month and year). KPI cards showing prominent information. Expense breakdown using sorted bar chart.
- Bar + Line graph for year wise expense tracking. Filter for year. These are the only visualizations needed for centre expenses, nothing else.
- Now, in the same page, 2 new sub sections. Staff salaries and Student fees.
- Filter and search to find teacher or student in their respective subsection. When their name appears, we will have "Paid salary till month, pending for months, total pending amount" or "Paid fees till month, pending for months, total pending amount".
- No visualization for specific fees and salaries section, it is being showed in expense breakdown and overall expense of centre already. This design helps to keep the financials page clean and intuitive.

## 4. Manage Page
- A main page visible in navigation section.
### a) Centre Management
- Access only to CEO. By default all centres will be visible in a table with proper info. Searches and filter will affect that.
- The ceo can search and view all the centres, filter them into active and inactive.
- Clicking on a centre gives more options like deactivating the centre or changing the data about it.
- There will be an add button to add a new centre.

### b) Courses Management
- Course section needs to be completely removed, there will be only batches that will be managed. This has to be removed from database too and other tables have to be adjusted accordingly, like removing the foreign key wherever needed.

### c) Batch Management
- Access to centre_head and ceo. By default all batches will be visible in a table with proper info. Searches and filter will affect that.
- CEO can filter centre wise wise batches. centre head can filter centre wise batches.
- The centre_head can search filter and view batches. He can add new batch, modify existing batch.
- There will be add batch button to add a new batch.

### d) Enrollment Management
- It will have 2 subsections, first one is for students and second for the teachers.
- CEO can filter centres, batches or search for student/teacher directly for viewing. 
- Centre Head can also filter student and teachers of their own centre. The main task they can do here is, we know that the student and teacher are already chosen their centre, the centre head will assign them batches. Also, the centre head while assigning (or modifying) a student profile in here have to put in monthly fee, or monthly salary for that student or teacher. One student can be in multiple batches and that can be viewed by clicking on his/her profile and all assigned courses will be visible, the assigned courses can be modified at the same time. Similarly, one teacher can teach in multiple batches or even multiple subjects in same batch, its salary has to be added at the same time.
- As I said the salary and fees will be managed here. As soon as the student is added into a batch, the invoice creation for him will start. The fees for first month will be (days remaining in that month)*(monthly fees)/total monthly fees. Similarly the salary has to be created for the teachers, the main thing here is student fees creation is managed in database, but the teachers salary creation has to be managed. This is very important. 

### e) Reward points
- It will have 2 subsections, one for defining rules for reward points, this is accessible only to the ceo. Next is for managing the reward points, accessible to both ceo and centre head, here the ceo or centre head can manually increase or reduce student's points.
- Accessible to centre head for his center and ceo has access to all students. CEO has center wise, batch wise filter and search option. Centre head has batch wise filter and search option.
- When opened, all student cards will be visible to both with their this total points next to their card, clicking on that will open the page showing all the logs of point addition by rules and any previous modification to them, a button to change point is available, top shows current points, a box for updated points will be available and the description box for change, description is mandatory.
- This is one of the most important thing, the reward point change logs with are not managed in database and has to be managed.
- This is also one of the most important thing that the UI and logic to give CEO a flexible way to define auto reward points rules has be be managed, it might be based on attendance or performance or timely fees payment, anything. This has to be completely defined and managed in both DB and front end.

CEO have read and write access to centres, read access to batches, enrollments. Centre head has read and write access to batches and enrollments and no access to centres management.

## 5. Tasks (Initially named as data-entry, need to rename)
- A main section visible in navigation section.
### a) Attendance
- Visible only to teachers.
- When this section is opened, all the batches assigned to the teacher are visible, search availale. Clicking on any batch will prompt to select a date. Once a date is selected, all the student list in that batch is visible, each student name is right next to checkbox, teacher checkboxes the present student, rest are automatically marked absent. If teacher selects a date whose attendance is already marked, the page opens with the already checked boxes as checked, so that the teacher can make whateever changes needed in that only.

### b) Exam Marks
- Visible only to teachers.
- When this section is opened, all batches will be visible. Search will be available. When clicked on a batch, all the exams (past and future will be visible there), teacher can create new exam for that batch. A button will be available, which will ask for subject, date, etc. details needed for creating new exam. This is another most important thing, it is probably not manages in db and needs to be managed.
- When exam is created, it can be clicked on to open the page where all student names of that batch is visible and then marks can be conviniently entered for that exam for that students.

### c) Content Library
- Visible only to teachers.
- When this section is opened, all batches will be visible. Search will be available. When clicked on a batch, all the uploaded content for that batch becomes visible. There will be a button for adding new content. Addition is simple, there will be option to choose between document and video and then put a link for any of the content with description/remarks(this parts needs to be checked in database).

### d) Expenses
- Visible to centre head and accountant of that centre.
- When opened, each card will hold information about a month. Summary of that month expenses will be visible on the card even before clicking on it.
- When clicked on a card (usually current month), there will be proper list of all expenses of that month. There will be button to add expense from predefiened list as it is now (e.g. rent, electricity, stationary, internet bill, miscellanoues with description). So expense will be added here as needed by centre admin and accountant, who added the entry and when will also be recorded and visible here only. And most important, entry added once cannot be deleted. If added by mistake, they can put negative entry in miscellanoues with description as compensation for that mistake.

### e) Salary
- Visible to centre head and accountant of that centre.
- Remember that I said we have to yet manage the monthly salary creation for teachers in database too, so the data will be fetched from there.
- When opened, all teachers card will be visible, with summary showing paid till, search and filter by batches will be available as usual. Clicking on teacher will show all previous payments record. Pending monthly payment cards will be automatically visible there, so they can be clicked, description can be written and payment done marked. Remember that we put option to add teachers salary when centre admin enrolls them into a batch, total salary will be fetched from that (if multiple batches, break down also visible).

### f) Fees
- Visible to centre head and accountant of that centre.
- When opened, all student cards with summary showing paid till, search and filter by batches available. Clicking on a student all previous fee payment record shows up (month wise). Clicking on a month which is unpaid or partially paid, it can be opened and 2 options are available, full or partial, as sometimes students pay partial monthly fees. 
- Also, the important thing here is the fee to be paid will be max(0, total pending fees - reward points of student)
- Remember that we should have trigger in db and table for montly student fees record.

### g) Staff attendance
- Visible only to centre head.
- When opened all the teachers cards will be visible with usual batch wise filter and search. Wihtout opening any card, the centre head can just see previous day info. When clicked on a teacher card, date option will be prompted. Once date is selected, it has to be selected as present, absent or partial, if partial, entry and exit time is mandatory.
- If already marked date is opened it will be shown in the state as it was when modified last time and changes will be facilitated.

## 6. Reports
- A main section visible in navigation section.
### a) Student profile
- Accessible to centre head for his center and ceo has access to all students. CEO has center wise, batch wise filter and search option. Centre head has batch wise filter and search option.
- When opened, all student profile cards will be visible with basic info and download button. Once clicked on download button, full profile will be downloaded of student in form of pdf only, no other format.

### b) Attendance
- Accessible to centre head for his center and ceo has access to all students. CEO has center wise, batch wise filter and search option. Centre head has batch wise filter and search option.
- When opened, all student cards will be visible with basic attendance summary and download button. Once clicked on download button, date range filter will be prompted and once that is selected, the full attendance data with analytics for that student will be downloaded in pdf form.

### c) Performance
- Accessible to centre head for his center and ceo has access to all students. CEO has center wise, batch wise filter and search option. Centre head has batch wise filter and search option.
- When opened, all student cards will be visible with basic performance summary and download button. Once clicked on download button, date range filter will be prompted and once that is selected, the full performance data with analytics for that student will be downloaded in pdf form.

## Others
1. Add app icon.
2. Add fading photo of related image from top to bottom.
3. All charts with proper legends.
4. My research revealed that manual use of ts leads to slower DOM, I am suggested to use State Managers and availables frameworks for that, to increase speed and reduce code.
5. Make changes if needed to main database schema. But finally I should have single file defining the whole schema and just needed mandatory data entry. No other even test data entry file should be present, because it will be done through UI only.
6. There should be consistency overall. For e.g. define a table or bar graph or pie chart once and use the same component forever, no duplication.
7. If you see carefully, there are repetitive components like filter for students and teachers, we can avoid repetition of logic.
8. The read and write access should be exactly how I have told, it should also resonate with the database, of not specific changes needs to be made.
9. Delete all views from database.
10. Keep only necessary triggers like automatic salary and fee creation.
11. Currently the navigation to sections is from the horizontal UI at the top. We want it into vertical fashion as given in the attached image. In face the entire UI redesigning has to be inspired by the attached images for reference.
12. The graphs should be intuitive and interactive.
13. Use zustand for client state and tanstack query for server state. This part needs major changes. This has to be done to reduce code and manage performance more efficiently.

You make a fair point! Looking closely at the overlapping elements, the gradients on the hero cards, and the floating widgets, there is absolutely a subtle, modern glass effect happening there. 

Here is the revised prompt formatted with simple markdown, integrating both light and dark modes while preserving the color palette and glassmorphic details.

## UI Re-design

### Core Color Palette 
- Primary (Soft Green): #94C691. Use for active sidebar items, soft background highlights, and subtle dark mode glows.
- Secondary (Dark Forest Green): #2D4B2A. Use for primary buttons and prominent headings in light mode, or deep contrast card backgrounds in dark mode.
- Tertiary (Bright Cyan): #04E7FE. Use sparingly for high-visibility actions (like Export buttons) and glowing notifications across both modes.
- Light Mode Neutral: #F0F4EF. Use for the main application background to provide soft contrast against white cards.
- Dark Mode Neutral: Deep slate or green-tinted dark gray (e.g., #0B120F). Use for the main application background to make neon accents pop.

### Background & Atmosphere
- Base Themes: Implement robust toggles for both a clean, airy Light Mode and a deep, immersive Dark Mode.
- Glassmorphism: Apply subtle frosted effects using backdrop-blur (e.g., backdrop-blur-md) on overlapping elements, sticky headers, and floating widgets.
- Light Mode Glass: Use semi-transparent white fills (e.g., bg-white/70) paired with very faint white borders to create frosted depth.
- Dark Mode Glass: Use semi-transparent dark fills (e.g., bg-slate-900/40) combined with subtle light borders (e.g., border-white/10) to create a glowing glass effect.

### Component Architecture & Card Styling
- Container Shapes: Use generous, pill-like rounding for all components and widgets (rounded-2xl or rounded-3xl).
- Light Mode Cards: Solid or frosted white cards with soft, diffuse drop shadows to float above the neutral background.
- Dark Mode Cards: Deep, semi-transparent dark cards with soft inner shadows or subtle colored drop shadows to establish visual hierarchy.
- Layout: Utilize a bento-box grid layout for dashboard elements, ensuring consistent spacing and padding.

### Typography & Data Visualization
- Headings: Bold, clean sans-serif typography.
- Light Mode Text: Secondary Dark Green (#2D4B2A) or deep charcoal for primary text, with slate tones for secondary descriptions.
- Dark Mode Text: Pure white or light gray for primary text, with muted light greens or grays for secondary descriptions.
- Data Accents: Use the Primary Green (#94C691) or Tertiary Cyan (#04E7FE) to highlight positive growth, trends, and key metrics.

### Implementation Guidelines
- The sample images for UI are available in the /ui folder, containing the exact palette and inspiration.
- Abstract and reuse all UI components (cards, buttons, typography hierarchy) everywhere for strict visual consistency.
- Ensure the UI is intuitive and logical to use, utilizing ample spacing and clear visual grouping.

## Database
- First file contains entire schema of the database along with data entry for crucial tables. Crucial means without which the database won't work. There should be 100% bijection between requirements and databse.
- In second file, there will be a lot of data entry. Few centres, batches for each centres, each batch has enough students, enough exams for each batch, performace, attendance, fees, salaries, expenses, etc. This heavy data entry will test the database and website. 
- Finally, DOCUMENTATION.md has the documentation for our database.