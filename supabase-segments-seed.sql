-- Contributo: Seed All 55 Official Course Syllabus Segments
-- Run this in your Supabase SQL Editor.
-- Uses ON CONFLICT (id) DO NOTHING so existing data is preserved safely.

INSERT INTO public.segments (id, course_id, segment_number, title, subtopics, exam_section)
VALUES
  -- ==================== 1. CHEM-2301 — Chemistry (8 Segments) ====================
  (
    'CHEM-2301-seg-1',
    'CHEM-2301',
    1,
    'Periodic Table',
    'Development of modern periodic table, periodic law, electronic configuration, ionization potential, electron affinity, electronegativity, atomic and ionic radii, properties of oxides',
    'Mid-Term'
  ),
  (
    'CHEM-2301-seg-2',
    'CHEM-2301',
    2,
    'Chemical Bonds',
    'Ionic, covalent, co-ordinate, metallic, Van der Waals and hydrogen bonds, hybridization, bonding in simple molecules, MOT',
    'Mid-Term'
  ),
  (
    'CHEM-2301-seg-3',
    'CHEM-2301',
    3,
    'Chemistry of Transition and Inner-transition Elements',
    'Definition, electronic configuration, physical and chemical properties',
    'Mid-Term'
  ),
  (
    'CHEM-2301-seg-4',
    'CHEM-2301',
    4,
    'Electrochemistry',
    'Electrolytic dissociation, conductance, ionic mobility and transport numbers, electrode potential, reversible cells',
    'Final Group-A'
  ),
  (
    'CHEM-2301-seg-5',
    'CHEM-2301',
    5,
    'Solution and its Properties',
    'Concentration units, ideal and real solutions, Henry''s Law, Nernst Law, partition coefficient, solvent extraction, dilute solutions',
    'Final Group-A'
  ),
  (
    'CHEM-2301-seg-6',
    'CHEM-2301',
    6,
    'Chemical Equilibrium',
    'Law of mass action, La Chatelier''s principle, Van''t Hoff equation',
    'Final Group-B'
  ),
  (
    'CHEM-2301-seg-7',
    'CHEM-2301',
    7,
    'Chemical Kinetics',
    'Order and molecularity, zero/first/second order reactions, half-life, Arrhenius equation, activation energy',
    'Final Group-B'
  ),
  (
    'CHEM-2301-seg-8',
    'CHEM-2301',
    8,
    'Surface Chemistry and Adsorption',
    'Langmuir and Gibbs adsorption isotherm, colloids, electrodialysis, preparation and properties of colloids',
    'Final Group-B'
  ),

  -- ==================== 2. CSE-2321 — Data Structures (8 Segments) ====================
  (
    'CSE-2321-seg-1',
    'CSE-2321',
    1,
    'Introduction',
    'Data organization, data types, data structure operations, algorithms, time-space tradeoff, algorithmic notation, strings, pattern matching',
    'Mid-Term'
  ),
  (
    'CSE-2321-seg-2',
    'CSE-2321',
    2,
    'Array',
    'Linear array, traversing, insertion and deletion, bubble sort, linear and binary search, 2D arrays, matrices, sparse matrices',
    'Mid-Term'
  ),
  (
    'CSE-2321-seg-3',
    'CSE-2321',
    3,
    'Linked List',
    'Representation in memory, traversing, searching, insertion and deletion, header linked lists, two-way lists',
    'Mid-Term'
  ),
  (
    'CSE-2321-seg-4',
    'CSE-2321',
    4,
    'Stack',
    'PUSH and POP, Polish and reverse Polish notation, postfix evaluation, infix to postfix',
    'Final Group-A'
  ),
  (
    'CSE-2321-seg-5',
    'CSE-2321',
    5,
    'Queue and Recursion',
    'Queue operations, deques, priority queues, factorial, Fibonacci, Ackermann function, Towers of Hanoi',
    'Final Group-A'
  ),
  (
    'CSE-2321-seg-6',
    'CSE-2321',
    6,
    'Complexity, Sorting, Searching and Hashing',
    'Big O, Omega, Theta, insertion/selection/quick/merge sort, hash functions, collision resolution',
    'Final Group-B'
  ),
  (
    'CSE-2321-seg-7',
    'CSE-2321',
    7,
    'Tree',
    'Binary trees, BST, heap, heapsort, B-trees, general tree, AVL tree, red-black tree',
    'Final Group-B'
  ),
  (
    'CSE-2321-seg-8',
    'CSE-2321',
    8,
    'Graph',
    'Graph terminology, adjacency matrix, path matrix, adjacency list, BFS and DFS',
    'Final Group-B'
  ),

  -- ==================== 3. CSE-2322 — Data Structures Lab (8 Segments) ====================
  (
    'CSE-2322-seg-1',
    'CSE-2322',
    1,
    'Introduction (Lab)',
    'Lab setup, C/C++ memory allocation, pointer mechanics, algorithmic notation implementation, pattern matching algorithms',
    'Mid-Term'
  ),
  (
    'CSE-2322-seg-2',
    'CSE-2322',
    2,
    'Array (Lab)',
    'Linear array coding, traversing, insertion/deletion, bubble sort code, linear & binary search, 2D array matrix operations',
    'Mid-Term'
  ),
  (
    'CSE-2322-seg-3',
    'CSE-2322',
    3,
    'Linked List (Lab)',
    'Singly linked list node implementation, traversal, search, insertion & deletion at head/tail/pos, doubly linked list',
    'Mid-Term'
  ),
  (
    'CSE-2322-seg-4',
    'CSE-2322',
    4,
    'Stack (Lab)',
    'Stack array and linked list implementation, PUSH/POP functions, infix to postfix conversion code, postfix evaluation',
    'Final Group-A'
  ),
  (
    'CSE-2322-seg-5',
    'CSE-2322',
    5,
    'Queue and Recursion (Lab)',
    'Linear & circular queue implementation, deques, priority queue code, recursive algorithms (Fibonacci, Hanoi, Ackermann)',
    'Final Group-A'
  ),
  (
    'CSE-2322-seg-6',
    'CSE-2322',
    6,
    'Complexity, Sorting, Searching and Hashing (Lab)',
    'Practical benchmarks for QuickSort, MergeSort, SelectionSort, hash table code, linear probing and chaining',
    'Final Group-B'
  ),
  (
    'CSE-2322-seg-7',
    'CSE-2322',
    7,
    'Tree (Lab)',
    'Binary search tree insertion, deletion, in-order/pre-order/post-order traversals, HeapSort implementation',
    'Final Group-B'
  ),
  (
    'CSE-2322-seg-8',
    'CSE-2322',
    8,
    'Graph (Lab)',
    'Graph representation using adjacency matrix and adjacency list, BFS traversal code, DFS traversal code',
    'Final Group-B'
  ),

  -- ==================== 4. CSE-2323 — Digital Logic Design (7 Segments) ====================
  (
    'CSE-2323-seg-1',
    'CSE-2323',
    1,
    'Binary Systems, Boolean Algebra and Logic Gates',
    'Number systems, binary codes, binary logic, logic gates, Boolean algebra, canonical and standard forms',
    'Mid-Term'
  ),
  (
    'CSE-2323-seg-2',
    'CSE-2323',
    2,
    'Simplification of Boolean Functions',
    'Map method with 2 to 6 variables, product of sum simplification, NAND and NOR implementation, don''t care conditions, multilevel NAND/NOR, exclusive-OR and equivalence functions',
    'Mid-Term'
  ),
  (
    'CSE-2323-seg-3',
    'CSE-2323',
    3,
    'Combinational Logic',
    'Design procedure, adders, subtractors, code conversion, analysis procedure',
    'Mid-Term'
  ),
  (
    'CSE-2323-seg-4',
    'CSE-2323',
    4,
    'Combinational Logic with MSI and LSI',
    'Binary parallel adder, look ahead carry, decimal adder, magnitude comparator, decoder, encoder, multiplexer and demultiplexer',
    'Final Group-A'
  ),
  (
    'CSE-2323-seg-5',
    'CSE-2323',
    5,
    'Sequential Logic',
    'Flip-flops, triggering, analysis of clocked sequential circuits, state reduction and assignment, design with state equations',
    'Final Group-A'
  ),
  (
    'CSE-2323-seg-6',
    'CSE-2323',
    6,
    'Registers, Counters and the Memory',
    'Registers, shift registers, ripple, asynchronous and synchronous counters, ROM, PLA, RAM, memory unit',
    'Final Group-B'
  ),
  (
    'CSE-2323-seg-7',
    'CSE-2323',
    7,
    'Register Transfer and Processor Logic Design',
    'Inter-register transfer, arithmetic-logic and shift operations, simple computer design, processor organization, ALU, accumulator',
    'Final Group-B'
  ),

  -- ==================== 5. CSE-2324 — Digital Logic Design Lab (7 Segments) ====================
  (
    'CSE-2324-seg-1',
    'CSE-2324',
    1,
    'Binary Systems & Logic Gates (Lab)',
    'Breadboard wiring, verifying truth tables of AND, OR, NOT, NAND, NOR, XOR IC gates',
    'Mid-Term'
  ),
  (
    'CSE-2324-seg-2',
    'CSE-2324',
    2,
    'Simplification of Boolean Functions (Lab)',
    'Implementing simplified SOP and POS logic circuits, universal gate implementations with NAND and NOR',
    'Mid-Term'
  ),
  (
    'CSE-2324-seg-3',
    'CSE-2324',
    3,
    'Combinational Logic (Lab)',
    'Half adder, full adder, half subtractor and full subtractor wiring and circuit simulation',
    'Mid-Term'
  ),
  (
    'CSE-2324-seg-4',
    'CSE-2324',
    4,
    'Combinational Logic with MSI and LSI (Lab)',
    'IC 7483 4-bit parallel adder, 74138 decoder, 74151 multiplexer design and simulation',
    'Final Group-A'
  ),
  (
    'CSE-2324-seg-5',
    'CSE-2324',
    5,
    'Sequential Logic (Lab)',
    'SR, D, JK and T flip-flop IC testing, clock generation and sequential state transition analysis',
    'Final Group-A'
  ),
  (
    'CSE-2324-seg-6',
    'CSE-2324',
    6,
    'Registers, Counters and Memory (Lab)',
    'Shift registers (SISO, SIPO, PISO, PIPO), asynchronous ripple counter and synchronous counter implementation',
    'Final Group-B'
  ),
  (
    'CSE-2324-seg-7',
    'CSE-2324',
    7,
    'ALU and Processor Logic Design (Lab)',
    '74181 ALU chip experiments, bus transfer, register transfer simulation, accumulator testing',
    'Final Group-B'
  ),

  -- ==================== 6. CSE-2340 — Software Development 1 (1 Segment) ====================
  (
    'CSE-2340-seg-1',
    'CSE-2340',
    1,
    'General Resources',
    'Software development fundamentals, project repository, documentation, tools, coding standards and version control (Syllabus pending official update)',
    'Mid-Term'
  ),

  -- ==================== 7. MATH-2307 — Mathematics III (8 Segments) ====================
  (
    'MATH-2307-seg-1',
    'MATH-2307',
    1,
    'Matrix Algebra',
    'Types of matrices, operations, transpose, adjoint and inverse, rank, row operations, orthogonality, Gram-Schmidt process, covariance matrix, adjacency matrix',
    'Mid-Term'
  ),
  (
    'MATH-2307-seg-2',
    'MATH-2307',
    2,
    'Linear Equations and Vector Spaces',
    'Echelon form, consistency, homogeneous and non-homogeneous systems, vector spaces, subspaces, basis and dimension, linear dependence',
    'Mid-Term'
  ),
  (
    'MATH-2307-seg-3',
    'MATH-2307',
    3,
    'Characteristic Roots',
    'Eigenvalues, eigenvectors, Cayley-Hamilton theorem, diagonalization',
    'Mid-Term'
  ),
  (
    'MATH-2307-seg-4',
    'MATH-2307',
    4,
    'Matrix Factorizations',
    'Eigen decomposition, SVD, LU, QR, Cholesky decomposition, MATLAB analysis',
    'Final Group-A'
  ),
  (
    'MATH-2307-seg-5',
    'MATH-2307',
    5,
    'Vector Analysis',
    'Vectors and scalars, vector algebra, scalar and vector fields, dot and cross product, vector differentiation, polar, cylindrical and spherical coordinates',
    'Final Group-A'
  ),
  (
    'MATH-2307-seg-6',
    'MATH-2307',
    6,
    'Multivariate Differentiation Operations',
    'Del operator, gradient, divergence, curl, formulas involving del',
    'Final Group-B'
  ),
  (
    'MATH-2307-seg-7',
    'MATH-2307',
    7,
    'Vector Integration',
    'Line integrals, surface integrals, volume integrals and applications',
    'Final Group-B'
  ),
  (
    'MATH-2307-seg-8',
    'MATH-2307',
    8,
    'General Theorems',
    'Divergence theorem, Green''s theorem, Stokes'' theorem, vector analysis using MATLAB',
    'Final Group-B'
  ),

  -- ==================== 8. STAT-2311 — Probability and Statistics (8 Segments) ====================
  (
    'STAT-2311-seg-1',
    'STAT-2311',
    1,
    'Preliminary Idea of Statistics',
    'Definition, scope and limitations of statistics, types of data, frequency distribution, graphical presentation of data',
    'Mid-Term'
  ),
  (
    'STAT-2311-seg-2',
    'STAT-2311',
    2,
    'Measures of Central Tendency',
    'Arithmetic mean, geometric mean, harmonic mean, median, mode, properties and comparative study of averages',
    'Mid-Term'
  ),
  (
    'STAT-2311-seg-3',
    'STAT-2311',
    3,
    'Measures of Dispersion of a Series of Data',
    'Range, quartile deviation, mean deviation, standard deviation, variance, coefficient of variation, moments, skewness, kurtosis',
    'Mid-Term'
  ),
  (
    'STAT-2311-seg-4',
    'STAT-2311',
    4,
    'Correlation Theory and Regression Analysis',
    'Scatter diagram, Pearson''s correlation coefficient, rank correlation, regression coefficients, regression lines, properties',
    'Final Group-A'
  ),
  (
    'STAT-2311-seg-5',
    'STAT-2311',
    5,
    'Basic Concepts of Probability',
    'Definitions of probability, sample space, events, mutually exclusive events, addition and multiplication theorems, conditional probability, Bayes'' theorem',
    'Final Group-A'
  ),
  (
    'STAT-2311-seg-6',
    'STAT-2311',
    6,
    'Random Variables and Mathematical Expectation',
    'Discrete and continuous random variables, probability mass function, probability density function, expectation, variance, covariance',
    'Final Group-B'
  ),
  (
    'STAT-2311-seg-7',
    'STAT-2311',
    7,
    'Probability Distributions',
    'Binomial distribution, Poisson distribution, Normal distribution and their applications and properties',
    'Final Group-B'
  ),
  (
    'STAT-2311-seg-8',
    'STAT-2311',
    8,
    'Test of Hypothesis and Estimation',
    'Point and interval estimation, confidence interval, null and alternative hypothesis, type I and II errors, level of significance, z-test, t-test, chi-square test',
    'Final Group-B'
  )
ON CONFLICT (id) DO NOTHING;
