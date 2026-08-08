import { db } from "./index";
import {
  users,
  affiliations,
  authors,
  categories,
  papers,
  paperVersions,
  paperAuthors,
  paperCategories,
  citations,
  roles,
  permissions,
  rolePermissions,
} from "./schema";
import { hashPassword } from "../auth/password";
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../permission-catalog";

const CATEGORIES: { id: string; parentId: string | null; name: string; description: string }[] = [
  { id: "cs", parentId: null, name: "Computer Science", description: "" },
  { id: "econ", parentId: null, name: "Economics", description: "" },
  { id: "eess", parentId: null, name: "Electrical Engineering and Systems Science", description: "" },
  { id: "math", parentId: null, name: "Mathematics", description: "" },
  { id: "physics", parentId: null, name: "Physics", description: "Accelerator theory and simulation. Accelerator technology. Accelerator experiments. Beam Physics. Accelerator design and optimization. Advanced accelerator concepts. Radiation sources including synchrotron light sources and free electron lasers. Applications of accelerators." },
  { id: "q-bio", parentId: null, name: "Quantitative Biology", description: "" },
  { id: "q-fin", parentId: null, name: "Quantitative Finance", description: "" },
  { id: "stat", parentId: null, name: "Statistics", description: "" },
  { id: "astro-ph", parentId: null, name: "Astrophysics", description: "Phenomenology of early universe, cosmic microwave background, cosmological parameters, primordial element abundances, extragalactic distance scale, large-scale structure of the universe. Groups, superclusters, voids, intergalactic medium. Particle astrophysics: dark energy, dark matter, baryogenesis, leptogenesis, inflationary models, reheating, monopoles, WIMPs, cosmic strings, primordial black holes, cosmological gravitational radiation" },
  { id: "cond-mat", parentId: null, name: "Condensed Matter", description: "Glasses and spin glasses; properties of random, aperiodic and quasiperiodic systems; transport in disordered media; localization; phenomena mediated by defects and disorder; neural networks" },
  { id: "gr-qc", parentId: null, name: "General Relativity and Quantum Cosmology", description: "General Relativity and Quantum Cosmology Areas of gravitational physics, including experiments and observations related to the detection and interpretation of gravitational waves, experimental tests of gravitational theories, computational general relativity, relativistic astrophysics, solutions to Einstein's equations and their properties, alternative theories of gravity, classical and quantum cosmology, and quantum gravity." },
  { id: "hep-ex", parentId: null, name: "High Energy Physics - Experiment", description: "Results from high-energy/particle physics experiments and prospects for future experimental results, including tests of the standard model, measurements of standard model parameters, searches for physics beyond the standard model, and astroparticle physics experimental results. Does not include: detectors and instrumentation nor analysis methods to conduct experiments." },
  { id: "hep-lat", parentId: null, name: "High Energy Physics - Lattice", description: "Lattice field theory. Phenomenology from lattice field theory. Algorithms for lattice field theory. Hardware for lattice field theory." },
  { id: "hep-ph", parentId: null, name: "High Energy Physics - Phenomenology", description: "Theoretical particle physics and its interrelation with experiment. Prediction of particle physics observables: models, effective field theories, calculation techniques. Particle physics: analysis of theory through experimental results." },
  { id: "hep-th", parentId: null, name: "High Energy Physics - Theory", description: "Formal aspects of quantum field theory. String theory, supersymmetry and supergravity." },
  { id: "math-ph", parentId: null, name: "Mathematical Physics", description: "Articles in this category focus on areas of research that illustrate the application of mathematics to problems in physics, develop mathematical methods for such applications, or provide mathematically rigorous formulations of existing physical theories. Submissions to math-ph should be of interest to both physically oriented mathematicians and mathematically oriented physicists; submissions which are primarily of interest to theoretical physicists or to mathematicians should probably be directed to the respective physics/math categories" },
  { id: "nlin", parentId: null, name: "Nonlinear Sciences", description: "Adaptation, self-organizing systems, statistical physics, fluctuating systems, stochastic processes, interacting particle systems, machine learning" },
  { id: "nucl-ex", parentId: null, name: "Nuclear Experiment", description: "Nuclear Experiment Results from experimental nuclear physics including the areas of fundamental interactions, measurements at low- and medium-energy, as well as relativistic heavy-ion collisions. Does not include: detectors and instrumentation nor analysis methods to conduct experiments; descriptions of experimental programs (present or future); comments on published results" },
  { id: "nucl-th", parentId: null, name: "Nuclear Theory", description: "Nuclear Theory Theory of nuclear structure covering wide area from models of hadron structure to neutron stars. Nuclear equation of states at different external conditions. Theory of nuclear reactions including heavy-ion reactions at low and high energies. It does not include problems of data analysis, physics of nuclear reactors, problems of safety, reactor construction" },
  { id: "quant-ph", parentId: null, name: "Quantum Physics", description: "Description coming soon" },
  { id: "cs.AI", parentId: "cs", name: "Artificial Intelligence", description: "Covers all areas of AI except Vision, Robotics, Machine Learning, Multiagent Systems, and Computation and Language (Natural Language Processing), which have separate subject areas. In particular, includes Expert Systems, Theorem Proving (although this may overlap with Logic in Computer Science), Knowledge Representation, Planning, and Uncertainty in AI. Roughly includes material in ACM Subject Classes I.2.0, I.2.1, I.2.3, I.2.4, I.2.8, and I.2.11." },
  { id: "cs.AR", parentId: "cs", name: "Hardware Architecture", description: "Covers systems organization and hardware architecture. Roughly includes material in ACM Subject Classes C.0, C.1, and C.5." },
  { id: "cs.CC", parentId: "cs", name: "Computational Complexity", description: "Covers models of computation, complexity classes, structural complexity, complexity tradeoffs, upper and lower bounds. Roughly includes material in ACM Subject Classes F.1 (computation by abstract devices), F.2.3 (tradeoffs among complexity measures), and F.4.3 (formal languages), although some material in formal languages may be more appropriate for Logic in Computer Science. Some material in F.2.1 and F.2.2, may also be appropriate here, but is more likely to have Data Structures and Algorithms as the primary subject area." },
  { id: "cs.CE", parentId: "cs", name: "Computational Engineering, Finance, and Science", description: "Covers applications of computer science to the mathematical modeling of complex systems in the fields of science, engineering, and finance. Papers here are interdisciplinary and applications-oriented, focusing on techniques and tools that enable challenging computational simulations to be performed, for which the use of supercomputers or distributed computing platforms is often required. Includes material in ACM Subject Classes J.2, J.3, and J.4 (economics)." },
  { id: "cs.CG", parentId: "cs", name: "Computational Geometry", description: "Roughly includes material in ACM Subject Classes I.3.5 and F.2.2." },
  { id: "cs.CL", parentId: "cs", name: "Computation and Language", description: "Covers natural language processing. Roughly includes material in ACM Subject Class I.2.7. Note that work on artificial languages (programming languages, logics, formal systems) that does not explicitly address natural-language issues broadly construed (natural-language processing, computational linguistics, speech, text retrieval, etc.) is not appropriate for this area." },
  { id: "cs.CR", parentId: "cs", name: "Cryptography and Security", description: "Covers all areas of cryptography and security including authentication, public key cryptosytems, proof-carrying code, etc. Roughly includes material in ACM Subject Classes D.4.6 and E.3." },
  { id: "cs.CV", parentId: "cs", name: "Computer Vision and Pattern Recognition", description: "Covers image processing, computer vision, pattern recognition, and scene understanding. Roughly includes material in ACM Subject Classes I.2.10, I.4, and I.5." },
  { id: "cs.CY", parentId: "cs", name: "Computers and Society", description: "Covers impact of computers on society, computer ethics, information technology and public policy, legal aspects of computing, computers and education. Roughly includes material in ACM Subject Classes K.0, K.2, K.3, K.4, K.5, and K.7." },
  { id: "cs.DB", parentId: "cs", name: "Databases", description: "Covers database management, datamining, and data processing. Roughly includes material in ACM Subject Classes E.2, E.5, H.0, H.2, and J.1." },
  { id: "cs.DC", parentId: "cs", name: "Distributed, Parallel, and Cluster Computing", description: "Covers fault-tolerance, distributed algorithms, stabilility, parallel computation, and cluster computing. Roughly includes material in ACM Subject Classes C.1.2, C.1.4, C.2.4, D.1.3, D.4.5, D.4.7, E.1." },
  { id: "cs.DL", parentId: "cs", name: "Digital Libraries", description: "Covers all aspects of the digital library design and document and text creation. Note that there will be some overlap with Information Retrieval (which is a separate subject area). Roughly includes material in ACM Subject Classes H.3.5, H.3.6, H.3.7, I.7." },
  { id: "cs.DM", parentId: "cs", name: "Discrete Mathematics", description: "Covers combinatorics, graph theory, applications of probability. Roughly includes material in ACM Subject Classes G.2 and G.3." },
  { id: "cs.DS", parentId: "cs", name: "Data Structures and Algorithms", description: "Covers data structures and analysis of algorithms. Roughly includes material in ACM Subject Classes E.1, E.2, F.2.1, and F.2.2." },
  { id: "cs.ET", parentId: "cs", name: "Emerging Technologies", description: "Covers approaches to information processing (computing, communication, sensing) and bio-chemical analysis based on alternatives to silicon CMOS-based technologies, such as nanoscale electronic, photonic, spin-based, superconducting, mechanical, bio-chemical and quantum technologies (this list is not exclusive). Topics of interest include (1) building blocks for emerging technologies, their scalability and adoption in larger systems, including integration with traditional technologies, (2) modeling, design and optimization of novel devices and systems, (3) models of computation, algorithm design and programming for emerging technologies." },
  { id: "cs.FL", parentId: "cs", name: "Formal Languages and Automata Theory", description: "Covers automata theory, formal language theory, grammars, and combinatorics on words. This roughly corresponds to ACM Subject Classes F.1.1, and F.4.3. Papers dealing with computational complexity should go to cs.CC; papers dealing with logic should go to cs.LO." },
  { id: "cs.GL", parentId: "cs", name: "General Literature", description: "Covers introductory material, survey material, predictions of future trends, biographies, and miscellaneous computer-science related material. Roughly includes all of ACM Subject Class A, except it does not include conference proceedings (which will be listed in the appropriate subject area)." },
  { id: "cs.GR", parentId: "cs", name: "Graphics", description: "Covers all aspects of computer graphics. Roughly includes material in all of ACM Subject Class I.3, except that I.3.5 is is likely to have Computational Geometry as the primary subject area." },
  { id: "cs.GT", parentId: "cs", name: "Computer Science and Game Theory", description: "Covers all theoretical and applied aspects at the intersection of computer science and game theory, including work in mechanism design, learning in games (which may overlap with Learning), foundations of agent modeling in games (which may overlap with Multiagent systems), coordination, specification and formal methods for non-cooperative computational environments. The area also deals with applications of game theory to areas such as electronic commerce." },
  { id: "cs.HC", parentId: "cs", name: "Human-Computer Interaction", description: "Covers human factors, user interfaces, and collaborative computing. Roughly includes material in ACM Subject Classes H.1.2 and all of H.5, except for H.5.1, which is more likely to have Multimedia as the primary subject area." },
  { id: "cs.IR", parentId: "cs", name: "Information Retrieval", description: "Covers indexing, dictionaries, retrieval, content and analysis. Roughly includes material in ACM Subject Classes H.3.0, H.3.1, H.3.2, H.3.3, and H.3.4." },
  { id: "cs.IT", parentId: "cs", name: "Information Theory", description: "Covers theoretical and experimental aspects of information theory and coding. Includes material in ACM Subject Class E.4 and intersects with H.1.1." },
  { id: "cs.LG", parentId: "cs", name: "Machine Learning", description: "Papers on all aspects of machine learning research (supervised, unsupervised, reinforcement learning, bandit problems, and so on) including also robustness, explanation, fairness, and methodology. cs.LG is also an appropriate primary category for applications of machine learning methods." },
  { id: "cs.LO", parentId: "cs", name: "Logic in Computer Science", description: "Covers all aspects of logic in computer science, including finite model theory, logics of programs, modal logic, and program verification. Programming language semantics should have Programming Languages as the primary subject area. Roughly includes material in ACM Subject Classes D.2.4, F.3.1, F.4.0, F.4.1, and F.4.2; some material in F.4.3 (formal languages) may also be appropriate here, although Computational Complexity is typically the more appropriate subject area." },
  { id: "cs.MA", parentId: "cs", name: "Multiagent Systems", description: "Covers multiagent systems, distributed artificial intelligence, intelligent agents, coordinated interactions. and practical applications. Roughly covers ACM Subject Class I.2.11." },
  { id: "cs.MM", parentId: "cs", name: "Multimedia", description: "Roughly includes material in ACM Subject Class H.5.1." },
  { id: "cs.MS", parentId: "cs", name: "Mathematical Software", description: "Roughly includes material in ACM Subject Class G.4." },
  { id: "cs.NA", parentId: "cs", name: "Numerical Analysis", description: "cs.NA is an alias for math.NA. Roughly includes material in ACM Subject Class G.1." },
  { id: "cs.NE", parentId: "cs", name: "Neural and Evolutionary Computing", description: "Covers neural networks, connectionism, genetic algorithms, artificial life, adaptive behavior. Roughly includes some material in ACM Subject Class C.1.3, I.2.6, I.5." },
  { id: "cs.NI", parentId: "cs", name: "Networking and Internet Architecture", description: "Covers all aspects of computer communication networks, including network architecture and design, network protocols, and internetwork standards (like TCP/IP). Also includes topics, such as web caching, that are directly relevant to Internet architecture and performance. Roughly includes all of ACM Subject Class C.2 except C.2.4, which is more likely to have Distributed, Parallel, and Cluster Computing as the primary subject area." },
  { id: "cs.OH", parentId: "cs", name: "Other Computer Science", description: "This is the classification to use for documents that do not fit anywhere else." },
  { id: "cs.OS", parentId: "cs", name: "Operating Systems", description: "Roughly includes material in ACM Subject Classes D.4.1, D.4.2., D.4.3, D.4.4, D.4.5, D.4.7, and D.4.9." },
  { id: "cs.PF", parentId: "cs", name: "Performance", description: "Covers performance measurement and evaluation, queueing, and simulation. Roughly includes material in ACM Subject Classes D.4.8 and K.6.2." },
  { id: "cs.PL", parentId: "cs", name: "Programming Languages", description: "Covers programming language semantics, language features, programming approaches (such as object-oriented programming, functional programming, logic programming). Also includes material on compilers oriented towards programming languages; other material on compilers may be more appropriate in Architecture (AR). Roughly includes material in ACM Subject Classes D.1 and D.3." },
  { id: "cs.RO", parentId: "cs", name: "Robotics", description: "Roughly includes material in ACM Subject Class I.2.9." },
  { id: "cs.SC", parentId: "cs", name: "Symbolic Computation", description: "Roughly includes material in ACM Subject Class I.1." },
  { id: "cs.SD", parentId: "cs", name: "Sound", description: "Covers all aspects of computing with sound, and sound as an information channel. Includes models of sound, analysis and synthesis, audio user interfaces, sonification of data, computer music, and sound signal processing. Includes ACM Subject Class H.5.5, and intersects with H.1.2, H.5.1, H.5.2, I.2.7, I.5.4, I.6.3, J.5, K.4.2." },
  { id: "cs.SE", parentId: "cs", name: "Software Engineering", description: "Covers design tools, software metrics, testing and debugging, programming environments, etc. Roughly includes material in all of ACM Subject Classes D.2, except that D.2.4 (program verification) should probably have Logics in Computer Science as the primary subject area." },
  { id: "cs.SI", parentId: "cs", name: "Social and Information Networks", description: "Covers the design, analysis, and modeling of social and information networks, including their applications for on-line information access, communication, and interaction, and their roles as datasets in the exploration of questions in these and other domains, including connections to the social and biological sciences. Analysis and modeling of such networks includes topics in ACM Subject classes F.2, G.2, G.3, H.2, and I.2; applications in computing include topics in H.3, H.4, and H.5; and applications at the interface of computing and other disciplines include topics in J.1--J.7. Papers on computer communication systems and network protocols (e.g. TCP/IP) are generally a closer fit to the Networking and Internet Architecture (cs.NI) category." },
  { id: "cs.SY", parentId: "cs", name: "Systems and Control", description: "cs.SY is an alias for eess.SY. This section includes theoretical and experimental research covering all facets of automatic control systems. The section is focused on methods of control system analysis and design using tools of modeling, simulation and optimization. Specific areas of research include nonlinear, distributed, adaptive, stochastic and robust control in addition to hybrid and discrete event systems. Application areas include automotive and aerospace control systems, network control, biological systems, multiagent and cooperative control, robotics, reinforcement learning, sensor networks, control of cyber-physical and energy-related systems, and control of computing systems." },
  { id: "econ.EM", parentId: "econ", name: "Econometrics", description: "Econometric Theory, Micro-Econometrics, Macro-Econometrics, Empirical Content of Economic Relations discovered via New Methods, Methodological Aspects of the Application of Statistical Inference to Economic Data." },
  { id: "econ.GN", parentId: "econ", name: "General Economics", description: "General methodological, applied, and empirical contributions to economics." },
  { id: "econ.TH", parentId: "econ", name: "Theoretical Economics", description: "Includes theoretical contributions to Contract Theory, Decision Theory, Game Theory, General Equilibrium, Growth, Learning and Evolution, Macroeconomics, Market and Mechanism Design, and Social Choice." },
  { id: "eess.AS", parentId: "eess", name: "Audio and Speech Processing", description: "Theory and methods for processing signals representing audio, speech, and language, and their applications. This includes analysis, synthesis, enhancement, transformation, classification and interpretation of such signals as well as the design, development, and evaluation of associated signal processing systems. Machine learning and pattern analysis applied to any of the above areas is also welcome. Specific topics of interest include: auditory modeling and hearing aids; acoustic beamforming and source localization; classification of acoustic scenes; speaker separation; active noise control and echo cancellation; enhancement; de-reverberation; bioacoustics; music signals analysis, synthesis and modification; music information retrieval; audio for multimedia and joint audio-video processing; spoken and written language modeling, segmentation, tagging, parsing, understanding, and translation; text mining; speech production, perception, and psychoacoustics; speech analysis, synthesis, and perceptual modeling and coding; robust speech recognition; speaker recognition and characterization; deep learning, online learning, and graphical models applied to speech, audio, and language signals; and implementation aspects ranging from system architecture to fast algorithms." },
  { id: "eess.IV", parentId: "eess", name: "Image and Video Processing", description: "Theory, algorithms, and architectures for the formation, capture, processing, communication, analysis, and display of images, video, and multidimensional signals in a wide variety of applications. Topics of interest include: mathematical, statistical, and perceptual image and video modeling and representation; linear and nonlinear filtering, de-blurring, enhancement, restoration, and reconstruction from degraded, low-resolution or tomographic data; lossless and lossy compression and coding; segmentation, alignment, and recognition; image rendering, visualization, and printing; computational imaging, including ultrasound, tomographic and magnetic resonance imaging; and image and video analysis, synthesis, storage, search and retrieval." },
  { id: "eess.SP", parentId: "eess", name: "Signal Processing", description: "Theory, algorithms, performance analysis and applications of signal and data analysis, including physical modeling, processing, detection and parameter estimation, learning, mining, retrieval, and information extraction. The term &#34;signal&#34; includes speech, audio, sonar, radar, geophysical, physiological, (bio-) medical, image, video, and multimodal natural and man-made signals, including communication signals and data. Topics of interest include: statistical signal processing, spectral estimation and system identification; filter design, adaptive filtering / stochastic learning; (compressive) sampling, sensing, and transform-domain methods including fast algorithms; signal processing for machine learning and machine learning for signal processing applications; in-network and graph signal processing; convex and nonconvex optimization methods for signal processing applications; radar, sonar, and sensor array beamforming and direction finding; communications signal processing; low power, multi-core and system-on-chip signal processing; sensing, communication, analysis and optimization for cyber-physical systems such as power grids and the Internet of Things." },
  { id: "eess.SY", parentId: "eess", name: "Systems and Control", description: "This section includes theoretical and experimental research covering all facets of automatic control systems. The section is focused on methods of control system analysis and design using tools of modeling, simulation and optimization. Specific areas of research include nonlinear, distributed, adaptive, stochastic and robust control in addition to hybrid and discrete event systems. Application areas include automotive and aerospace control systems, network control, biological systems, multiagent and cooperative control, robotics, reinforcement learning, sensor networks, control of cyber-physical and energy-related systems, and control of computing systems." },
  { id: "math.AC", parentId: "math", name: "Commutative Algebra", description: "Commutative rings, modules, ideals, homological algebra, computational aspects, invariant theory, connections to algebraic geometry and combinatorics" },
  { id: "math.AG", parentId: "math", name: "Algebraic Geometry", description: "Algebraic varieties, stacks, sheaves, schemes, moduli spaces, complex geometry, quantum cohomology" },
  { id: "math.AP", parentId: "math", name: "Analysis of PDEs", description: "Existence and uniqueness, boundary conditions, linear and non-linear operators, stability, soliton theory, integrable PDE's, conservation laws, qualitative dynamics" },
  { id: "math.AT", parentId: "math", name: "Algebraic Topology", description: "Homotopy theory, homological algebra, algebraic treatments of manifolds" },
  { id: "math.CA", parentId: "math", name: "Classical Analysis and ODEs", description: "Special functions, orthogonal polynomials, harmonic analysis, ODE's, differential relations, calculus of variations, approximations, expansions, asymptotics" },
  { id: "math.CO", parentId: "math", name: "Combinatorics", description: "Discrete mathematics, graph theory, enumeration, combinatorial optimization, Ramsey theory, combinatorial game theory" },
  { id: "math.CT", parentId: "math", name: "Category Theory", description: "Enriched categories, topoi, abelian categories, monoidal categories, homological algebra" },
  { id: "math.CV", parentId: "math", name: "Complex Variables", description: "Holomorphic functions, automorphic group actions and forms, pseudoconvexity, complex geometry, analytic spaces, analytic sheaves" },
  { id: "math.DG", parentId: "math", name: "Differential Geometry", description: "Complex, contact, Riemannian, pseudo-Riemannian and Finsler geometry, relativity, gauge theory, global analysis" },
  { id: "math.DS", parentId: "math", name: "Dynamical Systems", description: "Dynamics of differential equations and flows, mechanics, classical few-body problems, iterations, complex dynamics, delayed differential equations" },
  { id: "math.FA", parentId: "math", name: "Functional Analysis", description: "Banach spaces, function spaces, real functions, integral transforms, theory of distributions, measure theory" },
  { id: "math.GM", parentId: "math", name: "General Mathematics", description: "Mathematical material of general interest, topics not covered elsewhere" },
  { id: "math.GN", parentId: "math", name: "General Topology", description: "Continuum theory, point-set topology, spaces with algebraic structure, foundations, dimension theory, local and global properties" },
  { id: "math.GR", parentId: "math", name: "Group Theory", description: "Finite groups, topological groups, representation theory, cohomology, classification and structure" },
  { id: "math.GT", parentId: "math", name: "Geometric Topology", description: "Manifolds, orbifolds, polyhedra, cell complexes, foliations, geometric structures" },
  { id: "math.HO", parentId: "math", name: "History and Overview", description: "Biographies, philosophy of mathematics, mathematics education, recreational mathematics, communication of mathematics, ethics in mathematics" },
  { id: "math.IT", parentId: "math", name: "Information Theory", description: "math.IT is an alias for cs.IT. Covers theoretical and experimental aspects of information theory and coding." },
  { id: "math.KT", parentId: "math", name: "K-Theory and Homology", description: "Algebraic and topological K-theory, relations with topology, commutative algebra, and operator algebras" },
  { id: "math.LO", parentId: "math", name: "Logic", description: "Logic, set theory, point-set topology, formal mathematics" },
  { id: "math.MG", parentId: "math", name: "Metric Geometry", description: "Euclidean, hyperbolic, discrete, convex, coarse geometry, comparisons in Riemannian geometry, symmetric spaces" },
  { id: "math.MP", parentId: "math", name: "Mathematical Physics", description: "math.MP is an alias for math-ph. Articles in this category focus on areas of research that illustrate the application of mathematics to problems in physics, develop mathematical methods for such applications, or provide mathematically rigorous formulations of existing physical theories. Submissions to math-ph should be of interest to both physically oriented mathematicians and mathematically oriented physicists; submissions which are primarily of interest to theoretical physicists or to mathematicians should probably be directed to the respective physics/math categories" },
  { id: "math.NA", parentId: "math", name: "Numerical Analysis", description: "Numerical algorithms for problems in analysis and algebra, scientific computation" },
  { id: "math.NT", parentId: "math", name: "Number Theory", description: "Prime numbers, diophantine equations, analytic number theory, algebraic number theory, arithmetic geometry, Galois theory" },
  { id: "math.OA", parentId: "math", name: "Operator Algebras", description: "Algebras of operators on Hilbert space, C^*-algebras, von Neumann algebras, non-commutative geometry" },
  { id: "math.OC", parentId: "math", name: "Optimization and Control", description: "Operations research, linear programming, control theory, systems theory, optimal control, game theory" },
  { id: "math.PR", parentId: "math", name: "Probability", description: "Theory and applications of probability and stochastic processes: e.g. central limit theorems, large deviations, stochastic differential equations, models from statistical mechanics, queuing theory" },
  { id: "math.QA", parentId: "math", name: "Quantum Algebra", description: "Quantum groups, skein theories, operadic and diagrammatic algebra, quantum field theory" },
  { id: "math.RA", parentId: "math", name: "Rings and Algebras", description: "Non-commutative rings and algebras, non-associative algebras, universal algebra and lattice theory, linear algebra, semigroups" },
  { id: "math.RT", parentId: "math", name: "Representation Theory", description: "Linear representations of algebras and groups, Lie theory, associative algebras, multilinear algebra" },
  { id: "math.SG", parentId: "math", name: "Symplectic Geometry", description: "Hamiltonian systems, symplectic flows, classical integrable systems" },
  { id: "math.SP", parentId: "math", name: "Spectral Theory", description: "Schrodinger operators, operators on manifolds, general differential operators, numerical studies, integral operators, discrete models, resonances, non-self-adjoint operators, random operators/matrices" },
  { id: "math.ST", parentId: "math", name: "Statistics Theory", description: "Applied, computational and theoretical statistics: e.g. statistical inference, regression, time series, multivariate analysis, data analysis, Markov chain Monte Carlo, design of experiments, case studies" },
  { id: "astro-ph.CO", parentId: "astro-ph", name: "Cosmology and Nongalactic Astrophysics", description: "Phenomenology of early universe, cosmic microwave background, cosmological parameters, primordial element abundances, extragalactic distance scale, large-scale structure of the universe. Groups, superclusters, voids, intergalactic medium. Particle astrophysics: dark energy, dark matter, baryogenesis, leptogenesis, inflationary models, reheating, monopoles, WIMPs, cosmic strings, primordial black holes, cosmological gravitational radiation" },
  { id: "astro-ph.EP", parentId: "astro-ph", name: "Earth and Planetary Astrophysics", description: "Interplanetary medium, planetary physics, planetary astrobiology, extrasolar planets, comets, asteroids, meteorites. Structure and formation of the solar system" },
  { id: "astro-ph.GA", parentId: "astro-ph", name: "Astrophysics of Galaxies", description: "Phenomena pertaining to galaxies or the Milky Way. Star clusters, HII regions and planetary nebulae, the interstellar medium, atomic and molecular clouds, dust. Stellar populations. Galactic structure, formation, dynamics. Galactic nuclei, bulges, disks, halo. Active Galactic Nuclei, supermassive black holes, quasars. Gravitational lens systems. The Milky Way and its contents" },
  { id: "astro-ph.HE", parentId: "astro-ph", name: "High Energy Astrophysical Phenomena", description: "Cosmic ray production, acceleration, propagation, detection. Gamma ray astronomy and bursts, X-rays, charged particles, supernovae and other explosive phenomena, stellar remnants and accretion systems, jets, microquasars, neutron stars, pulsars, black holes" },
  { id: "astro-ph.IM", parentId: "astro-ph", name: "Instrumentation and Methods for Astrophysics", description: "Detector and telescope design, experiment proposals. Laboratory Astrophysics. Methods for data analysis, statistical methods. Software, database design" },
  { id: "astro-ph.SR", parentId: "astro-ph", name: "Solar and Stellar Astrophysics", description: "White dwarfs, brown dwarfs, cataclysmic variables. Star formation and protostellar systems, stellar astrobiology, binary and multiple systems of stars, stellar evolution and structure, coronas. Central stars of planetary nebulae. Helioseismology, solar neutrinos, production and detection of gravitational radiation from stellar systems" },
  { id: "cond-mat.dis-nn", parentId: "cond-mat", name: "Disordered Systems and Neural Networks", description: "Glasses and spin glasses; properties of random, aperiodic and quasiperiodic systems; transport in disordered media; localization; phenomena mediated by defects and disorder; neural networks" },
  { id: "cond-mat.mes-hall", parentId: "cond-mat", name: "Mesoscale and Nanoscale Physics", description: "Semiconducting nanostructures: quantum dots, wires, and wells. Single electronics, spintronics, 2d electron gases, quantum Hall effect, nanotubes, graphene, plasmonic nanostructures" },
  { id: "cond-mat.mtrl-sci", parentId: "cond-mat", name: "Materials Science", description: "Techniques, synthesis, characterization, structure. Structural phase transitions, mechanical properties, phonons. Defects, adsorbates, interfaces" },
  { id: "cond-mat.other", parentId: "cond-mat", name: "Other Condensed Matter", description: "Work in condensed matter that does not fit into the other cond-mat classifications" },
  { id: "cond-mat.quant-gas", parentId: "cond-mat", name: "Quantum Gases", description: "Ultracold atomic and molecular gases, Bose-Einstein condensation, Feshbach resonances, spinor condensates, optical lattices, quantum simulation with cold atoms and molecules, macroscopic interference phenomena" },
  { id: "cond-mat.soft", parentId: "cond-mat", name: "Soft Condensed Matter", description: "Membranes, polymers, liquid crystals, glasses, colloids, granular matter" },
  { id: "cond-mat.stat-mech", parentId: "cond-mat", name: "Statistical Mechanics", description: "Phase transitions, thermodynamics, field theory, non-equilibrium phenomena, renormalization group and scaling, integrable models, turbulence" },
  { id: "cond-mat.str-el", parentId: "cond-mat", name: "Strongly Correlated Electrons", description: "Quantum magnetism, non-Fermi liquids, spin liquids, quantum criticality, charge density waves, metal-insulator transitions" },
  { id: "cond-mat.supr-con", parentId: "cond-mat", name: "Superconductivity", description: "Superconductivity: theory, models, experiment. Superflow in helium" },
  { id: "nlin.AO", parentId: "nlin", name: "Adaptation and Self-Organizing Systems", description: "Adaptation, self-organizing systems, statistical physics, fluctuating systems, stochastic processes, interacting particle systems, machine learning" },
  { id: "nlin.CD", parentId: "nlin", name: "Chaotic Dynamics", description: "Dynamical systems, chaos, quantum chaos, topological dynamics, cycle expansions, turbulence, propagation" },
  { id: "nlin.CG", parentId: "nlin", name: "Cellular Automata and Lattice Gases", description: "Computational methods, time series analysis, signal processing, wavelets, lattice gases" },
  { id: "nlin.PS", parentId: "nlin", name: "Pattern Formation and Solitons", description: "Pattern formation, coherent structures, solitons" },
  { id: "nlin.SI", parentId: "nlin", name: "Exactly Solvable and Integrable Systems", description: "Exactly solvable systems, integrable PDEs, integrable ODEs, Painleve analysis, integrable discrete maps, solvable lattice models, integrable quantum systems" },
  { id: "physics.acc-ph", parentId: "physics", name: "Accelerator Physics", description: "Accelerator theory and simulation. Accelerator technology. Accelerator experiments. Beam Physics. Accelerator design and optimization. Advanced accelerator concepts. Radiation sources including synchrotron light sources and free electron lasers. Applications of accelerators." },
  { id: "physics.ao-ph", parentId: "physics", name: "Atmospheric and Oceanic Physics", description: "Atmospheric and oceanic physics and physical chemistry, biogeophysics, and climate science" },
  { id: "physics.app-ph", parentId: "physics", name: "Applied Physics", description: "Applications of physics to new technology, including electronic devices, optics, photonics, microwaves, spintronics, advanced materials, metamaterials, nanotechnology, and energy sciences." },
  { id: "physics.atm-clus", parentId: "physics", name: "Atomic and Molecular Clusters", description: "Atomic and molecular clusters, nanoparticles: geometric, electronic, optical, chemical, magnetic properties, shell structure, phase transitions, optical spectroscopy, mass spectrometry, photoelectron spectroscopy, ionization potential, electron affinity, interaction with intense light pulses, electron diffraction, light scattering, ab initio calculations, DFT theory, fragmentation, Coulomb explosion, hydrodynamic expansion." },
  { id: "physics.atom-ph", parentId: "physics", name: "Atomic Physics", description: "Atomic and molecular structure, spectra, collisions, and data. Atoms and molecules in external fields. Molecular dynamics and coherent and optical control. Cold atoms and molecules. Cold collisions. Optical lattices." },
  { id: "physics.bio-ph", parentId: "physics", name: "Biological Physics", description: "Molecular biophysics, cellular biophysics, neurological biophysics, membrane biophysics, single-molecule biophysics, ecological biophysics, quantum phenomena in biological systems (quantum biophysics), theoretical biophysics, molecular dynamics/modeling and simulation, game theory, biomechanics, bioinformatics, microorganisms, virology, evolution, biophysical methods." },
  { id: "physics.chem-ph", parentId: "physics", name: "Chemical Physics", description: "Experimental, computational, and theoretical physics of atoms, molecules, and clusters - Classical and quantum description of states, processes, and dynamics; spectroscopy, electronic structure, conformations, reactions, interactions, and phases. Chemical thermodynamics. Disperse systems. High pressure chemistry. Solid state chemistry. Surface and interface chemistry." },
  { id: "physics.class-ph", parentId: "physics", name: "Classical Physics", description: "Newtonian and relativistic dynamics; many particle systems; planetary motions; chaos in classical dynamics. Maxwell's equations and dynamics of charged systems and electromagnetic forces in materials. Vibrating systems such as membranes and cantilevers; optomechanics. Classical waves, including acoustics and elasticity; physics of music and musical instruments. Classical thermodynamics and heat flow problems." },
  { id: "physics.comp-ph", parentId: "physics", name: "Computational Physics", description: "All aspects of computational science applied to physics." },
  { id: "physics.data-an", parentId: "physics", name: "Data Analysis, Statistics and Probability", description: "Methods, software and hardware for physics data analysis: data processing and storage; measurement methodology; statistical and mathematical aspects such as parametrization and uncertainties." },
  { id: "physics.ed-ph", parentId: "physics", name: "Physics Education", description: "Report of results of a research study, laboratory experience, assessment or classroom practice that represents a way to improve teaching and learning in physics. Also, report on misconceptions of students, textbook errors, and other similar information relative to promoting physics understanding." },
  { id: "physics.flu-dyn", parentId: "physics", name: "Fluid Dynamics", description: "Turbulence, instabilities, incompressible/compressible flows, reacting flows. Aero/hydrodynamics, fluid-structure interactions, acoustics. Biological fluid dynamics, micro/nanofluidics, interfacial phenomena. Complex fluids, suspensions and granular flows, porous media flows. Geophysical flows, thermoconvective and stratified flows. Mathematical and computational methods for fluid dynamics, fluid flow models, experimental techniques." },
  { id: "physics.gen-ph", parentId: "physics", name: "General Physics", description: "Description coming soon" },
  { id: "physics.geo-ph", parentId: "physics", name: "Geophysics", description: "Atmospheric physics. Biogeosciences. Computational geophysics. Geographic location. Geoinformatics. Geophysical techniques. Hydrospheric geophysics. Magnetospheric physics. Mathematical geophysics. Planetology. Solar system. Solid earth geophysics. Space plasma physics. Mineral physics. High pressure physics." },
  { id: "physics.hist-ph", parentId: "physics", name: "History and Philosophy of Physics", description: "History and philosophy of all branches of physics, astrophysics, and cosmology, including appreciations of physicists." },
  { id: "physics.ins-det", parentId: "physics", name: "Instrumentation and Detectors", description: "Instrumentation and Detectors for research in natural science, including optical, molecular, atomic, nuclear and particle physics instrumentation and the associated electronics, services, infrastructure and control equipment." },
  { id: "physics.med-ph", parentId: "physics", name: "Medical Physics", description: "Radiation therapy. Radiation dosimetry. Biomedical imaging modelling. Reconstruction, processing, and analysis. Biomedical system modelling and analysis. Health physics. New imaging or therapy modalities." },
  { id: "physics.optics", parentId: "physics", name: "Optics", description: "Adaptive optics. Astronomical optics. Atmospheric optics. Biomedical optics. Cardinal points. Collimation. Doppler effect. Fiber optics. Fourier optics. Geometrical optics (Gradient index optics. Holography. Infrared optics. Integrated optics. Laser applications. Laser optical systems. Lasers. Light amplification. Light diffraction. Luminescence. Microoptics. Nano optics. Ocean optics. Optical computing. Optical devices. Optical imaging. Optical materials. Optical metrology. Optical microscopy. Optical properties. Optical signal processing. Optical testing techniques. Optical wave propagation. Paraxial optics. Photoabsorption. Photoexcitations. Physical optics. Physiological optics. Quantum optics. Segmented optics. Spectra. Statistical optics. Surface optics. Ultrafast optics. Wave optics. X-ray optics." },
  { id: "physics.plasm-ph", parentId: "physics", name: "Plasma Physics", description: "Fundamental plasma physics. Magnetically Confined Plasmas (includes magnetic fusion energy research). High Energy Density Plasmas (inertial confinement plasmas, laser-plasma interactions). Ionospheric, Heliophysical, and Astrophysical plasmas (includes sun and solar system plasmas). Lasers, Accelerators, and Radiation Generation. Low temperature plasmas and plasma applications (include dusty plasmas, semiconductor etching, plasma-based nanotechnology, medical applications). Plasma Diagnostics, Engineering and Enabling Technologies (includes fusion reactor design, heating systems, diagnostics, experimental techniques)" },
  { id: "physics.pop-ph", parentId: "physics", name: "Popular Physics", description: "Description coming soon" },
  { id: "physics.soc-ph", parentId: "physics", name: "Physics and Society", description: "Structure, dynamics and collective behavior of societies and groups (human or otherwise). Quantitative analysis of social networks and other complex networks. Physics and engineering of infrastructure and systems of broad societal impact (e.g., energy grids, transportation networks)." },
  { id: "physics.space-ph", parentId: "physics", name: "Space Physics", description: "Space plasma physics. Heliophysics. Space weather. Planetary magnetospheres, ionospheres and magnetotail. Auroras. Interplanetary space. Cosmic rays. Synchrotron radiation. Radio astronomy." },
  { id: "q-bio.BM", parentId: "q-bio", name: "Biomolecules", description: "DNA, RNA, proteins, lipids, etc.; molecular structures and folding kinetics; molecular interactions; single-molecule manipulation." },
  { id: "q-bio.CB", parentId: "q-bio", name: "Cell Behavior", description: "Cell-cell signaling and interaction; morphogenesis and development; apoptosis; bacterial conjugation; viral-host interaction; immunology" },
  { id: "q-bio.GN", parentId: "q-bio", name: "Genomics", description: "DNA sequencing and assembly; gene and motif finding; RNA editing and alternative splicing; genomic structure and processes (replication, transcription, methylation, etc); mutational processes." },
  { id: "q-bio.MN", parentId: "q-bio", name: "Molecular Networks", description: "Gene regulation, signal transduction, proteomics, metabolomics, gene and enzymatic networks" },
  { id: "q-bio.NC", parentId: "q-bio", name: "Neurons and Cognition", description: "Synapse, cortex, neuronal dynamics, neural network, sensorimotor control, behavior, attention" },
  { id: "q-bio.OT", parentId: "q-bio", name: "Other Quantitative Biology", description: "Work in quantitative biology that does not fit into the other q-bio classifications" },
  { id: "q-bio.PE", parentId: "q-bio", name: "Populations and Evolution", description: "Population dynamics, spatio-temporal and epidemiological models, dynamic speciation, co-evolution, biodiversity, foodwebs, aging; molecular evolution and phylogeny; directed evolution; origin of life" },
  { id: "q-bio.QM", parentId: "q-bio", name: "Quantitative Methods", description: "All experimental, numerical, statistical and mathematical contributions of value to biology" },
  { id: "q-bio.SC", parentId: "q-bio", name: "Subcellular Processes", description: "Assembly and control of subcellular structures (channels, organelles, cytoskeletons, capsules, etc.); molecular motors, transport, subcellular localization; mitosis and meiosis" },
  { id: "q-bio.TO", parentId: "q-bio", name: "Tissues and Organs", description: "Blood flow in vessels, biomechanics of bones, electrical waves, endocrine system, tumor growth" },
  { id: "q-fin.CP", parentId: "q-fin", name: "Computational Finance", description: "Computational methods, including Monte Carlo, PDE, lattice and other numerical methods with applications to financial modeling" },
  { id: "q-fin.EC", parentId: "q-fin", name: "Economics", description: "q-fin.EC is an alias for econ.GN. Economics, including micro and macro economics, international economics, theory of the firm, labor economics, and other economic topics outside finance" },
  { id: "q-fin.GN", parentId: "q-fin", name: "General Finance", description: "Development of general quantitative methodologies with applications in finance" },
  { id: "q-fin.MF", parentId: "q-fin", name: "Mathematical Finance", description: "Mathematical and analytical methods of finance, including stochastic, probabilistic and functional analysis, algebraic, geometric and other methods" },
  { id: "q-fin.PM", parentId: "q-fin", name: "Portfolio Management", description: "Security selection and optimization, capital allocation, investment strategies and performance measurement" },
  { id: "q-fin.PR", parentId: "q-fin", name: "Pricing of Securities", description: "Valuation and hedging of financial securities, their derivatives, and structured products" },
  { id: "q-fin.RM", parentId: "q-fin", name: "Risk Management", description: "Measurement and management of financial risks in trading, banking, insurance, corporate and other applications" },
  { id: "q-fin.ST", parentId: "q-fin", name: "Statistical Finance", description: "Statistical, econometric and econophysics analyses with applications to financial markets and economic data" },
  { id: "q-fin.TR", parentId: "q-fin", name: "Trading and Market Microstructure", description: "Market microstructure, liquidity, exchange and auction design, automated trading, agent-based modeling and market-making" },
  { id: "stat.AP", parentId: "stat", name: "Applications", description: "Biology, Education, Epidemiology, Engineering, Environmental Sciences, Medical, Physical Sciences, Quality Control, Social Sciences" },
  { id: "stat.CO", parentId: "stat", name: "Computation", description: "Algorithms, Simulation, Visualization" },
  { id: "stat.ME", parentId: "stat", name: "Methodology", description: "Design, Surveys, Model Selection, Multiple Testing, Multivariate Methods, Signal and Image Processing, Time Series, Smoothing, Spatial Statistics, Survival Analysis, Nonparametric and Semiparametric Methods" },
  { id: "stat.ML", parentId: "stat", name: "Machine Learning", description: "Covers machine learning papers (supervised, unsupervised, semi-supervised learning, graphical models, reinforcement learning, bandits, high dimensional inference, etc.) with a statistical or theoretical grounding" },
  { id: "stat.OT", parentId: "stat", name: "Other Statistics", description: "Work in statistics that does not fit into the other stat classifications" },
  { id: "stat.TH", parentId: "stat", name: "Statistics Theory", description: "stat.TH is an alias for math.ST. Asymptotics, Bayesian Inference, Decision Theory, Estimation, Foundations, Inference, Testing." },
];





// Seed the RBAC foundation: system roles, the permission catalog, and the
// default role → permission links. Idempotent via onConflictDoNothing.
async function seedRbac() {
  console.log("Seeding RBAC roles & permissions…");

  const roleDefs = [
    { key: "admin", name: "管理员", description: "拥有全部权限", isSystem: true },
    { key: "moderator", name: "审核员", description: "内容审核与工单处置", isSystem: true },
    { key: "author", name: "作者", description: "提交并管理自己的论文", isSystem: true },
    { key: "reader", name: "读者", description: "浏览与评论", isSystem: true },
  ];
  for (const r of roleDefs) {
    await db.insert(roles).values(r).onConflictDoNothing({ target: roles.key });
  }

  for (const p of PERMISSIONS) {
    await db
      .insert(permissions)
      .values({ key: p.key, name: p.name, group: p.group, description: p.description })
      .onConflictDoNothing({ target: permissions.key });
  }

  // Resolve ids for linking.
  const roleRows = await db.select({ id: roles.id, key: roles.key }).from(roles);
  const permRows = await db.select({ id: permissions.id, key: permissions.key }).from(permissions);
  const roleIdByKey = new Map(roleRows.map((r) => [r.key, r.id]));
  const permIdByKey = new Map(permRows.map((p) => [p.key, p.id]));

  const links: { roleId: number; permissionId: number }[] = [];
  for (const [roleKey, permKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const roleId = roleIdByKey.get(roleKey);
    if (roleId == null) continue;
    for (const pk of permKeys) {
      const permId = permIdByKey.get(pk);
      if (permId != null) links.push({ roleId, permissionId: permId });
    }
  }
  for (const l of links) {
    await db.insert(rolePermissions).values(l).onConflictDoNothing();
  }
}

async function main() {
  console.log("Seeding categories…");
  for (const c of CATEGORIES) {
    await db.insert(categories).values(c).onConflictDoNothing();
  }

  await seedRbac();

  console.log("Seeding demo user…");
  const pw = await hashPassword("password123");
  const [user] = await db
    .insert(users)
    .values({ username: "demo", email: "demo@papex.dev", displayName: "Demo Author", passwordHash: pw })
    .onConflictDoNothing()
    .returning();

  console.log("Seeding admin user…");
  const adminPw = await hashPassword("admin123456");
  await db
    .insert(users)
    .values({
      username: "admin",
      email: "admin@papex.dev",
      displayName: "Administrator",
      passwordHash: adminPw,
      role: "admin",
    })
    .onConflictDoNothing();

  console.log("Seeding affiliation & author…");
  const [aff] = await db
    .insert(affiliations)
    .values({ name: "Papex University", country: "CN" })
    .onConflictDoNothing()
    .returning();
  const [author] = await db
    .insert(authors)
    .values({ name: "Demo Author", affiliationId: aff?.id, userId: user?.id })
    .onConflictDoNothing()
    .returning();

  console.log("Seeding demo papers…");
  const demo = [
    {
      id: "2608.00001",
      title: "A Modern Open-Source Paper Management System",
      abstract:
        "We present Papex, an open-source platform for managing and discovering scholarly literature. Built with Next.js and Drizzle ORM, it supports versioning, full-text search, and open APIs.",
      cat: "cs.LG",
    },
    {
      id: "2608.00002",
      title: "Efficient Full-Text Retrieval for Scholarly Repositories",
      abstract:
        "This paper studies tsvector-based indexing for large scholarly corpora and demonstrates sub-second query latency at scale.",
      cat: "cs.IR",
    },
    {
      id: "2608.00003",
      title: "面向学术论文的中文全文检索方法研究",
      abstract:
        "本文研究面向中英混合学术论文的全文检索方法，结合 trigram 三元组索引与分词策略，在中文子串匹配场景下取得了良好的召回率与查询延迟。",
      cat: "cs.CL",
    },
  ];

  for (const d of demo) {
    await db
      .insert(papers)
      .values({ id: d.id, title: d.title, primaryCategoryId: d.cat, status: "approved", createdById: user?.id })
      .onConflictDoNothing();
    await db
      .insert(paperVersions)
      .values({
        paperId: d.id,
        version: 1,
        title: d.title,
        abstract: d.abstract,
        authorsJson: [{ name: "Demo Author", order: 0, authorId: author?.id }],
        pdfUrl: null,
        license: "CC-BY-4.0",
      })
      .onConflictDoNothing();
    if (author) {
      await db
        .insert(paperAuthors)
        .values({ paperId: d.id, authorId: author.id, order: 0 })
        .onConflictDoNothing();
    }
    await db
      .insert(paperCategories)
      .values({ paperId: d.id, categoryId: d.cat, isPrimary: true })
      .onConflictDoNothing();
  }

  console.log("Seeding demo citation…");
  await db
    .insert(citations)
    .values({ paperId: "2608.00002", targetPaperId: "2608.00001", targetTitle: "A Modern Open-Source Paper Management System" })
    .onConflictDoNothing();

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
