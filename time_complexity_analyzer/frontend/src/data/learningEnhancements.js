/**
 * Supplemental learning content for the Learning hub (tables, glossary, per-topic tips).
 * Algorithm names must match `algorithmsData.json` exactly.
 */

export const SORTING_COMPLEXITY_ROWS = [
  { name: "Insertion Sort", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Yes" },
  { name: "Selection Sort", best: "O(n²)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "No*" },
  { name: "Heap Sort", best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(1)", stable: "No" },
  { name: "Bubble Sort", best: "O(n)*", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Yes" },
  { name: "Quick Sort", best: "O(n log n)", average: "O(n log n)", worst: "O(n²)", space: "O(log n)", stable: "No" },
  { name: "Merge Sort", best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: "Yes" },
];

/** Footnotes for table — shown as caption */
export const COMPLEXITY_TABLE_NOTES =
  "*Bubble sort best case assumes an early-exit optimization on sorted input. *Selection sort can be stable with careful tie-breaking but common swap-based versions are not.";

export function getSortingComplexityRow(algorithmName) {
  return SORTING_COMPLEXITY_ROWS.find((r) => r.name === algorithmName) || null;
}

/** Per-topic: interview angle + pitfalls + something to try in the Analyzer */
export const TOPIC_ENRICHMENTS = {
  "Insertion Sort": {
    interviewTip:
      "Interviewers like insertion sort for discussing best vs average case and stability. Be ready to compare it to selection sort on nearly sorted data.",
    pitfalls: [
      "Do not claim O(n log n) overall—it is quadratic in the general case.",
      "Remember it is stable: equal keys keep relative order, which matters for multi-key sorts.",
    ],
    tryInAnalyzer: "Paste sorted, reverse-sorted, and random arrays; compare growth to merge sort on the same sizes.",
  },
  "Selection Sort": {
    interviewTip:
      "Use selection sort to explain why scanning for the minimum every pass yields Theta(n²) even when the input is sorted.",
    pitfalls: [
      "Avoid saying it is adaptive to sorted input—unlike insertion sort, work per pass does not shrink meaningfully.",
      "Swapping non-adjacent equal keys breaks stability in the usual formulation.",
    ],
    tryInAnalyzer: "Run on equal elements with a secondary key to see stability issues if you log swaps.",
  },
  "Heap Sort": {
    interviewTip:
      "Heap sort is the go-to example for O(n log n) worst-case time with O(1) extra space—contrast with merge sort’s O(n) buffer.",
    pitfalls: [
      "Do not confuse binary heap property with BST ordering; heaps are weaker (parent vs children only).",
      "Cache behavior is often worse than quicksort despite asymptotics.",
    ],
    tryInAnalyzer: "Stress large random arrays vs quicksort to feel constant-factor differences in practice.",
  },
  "Bubble Sort": {
    interviewTip:
      "Treat bubble sort as a teaching tool: explain inversions, passes, and optional early exit—not production choice.",
    pitfalls: [
      "Without early exit, best case is still O(n²) comparisons on sorted input.",
      "Do not present it as faster than insertion sort for real workloads.",
    ],
    tryInAnalyzer: "Toggle nearly sorted vs random to see when early exit changes wall-clock.",
  },
  "Quick Sort": {
    interviewTip:
      "Know pivot strategies (random, median-of-three) and why sorted input + naive pivot hits O(n²). Mention introspection (e.g. introsort).",
    pitfalls: [
      "Average O(n log n) is not a guarantee—articulate worst case and mitigations.",
      "Space is typically O(log n) recursion stack, not always O(1).",
    ],
    tryInAnalyzer: "Sorted arrays with middle vs last pivot illustrate worst-case behavior.",
  },
  "Merge Sort": {
    interviewTip:
      "Emphasize stability and predictable O(n log n) at the cost of auxiliary memory—classic divide-and-conquer interview pattern.",
    pitfalls: [
      "Merging in-place in O(n) time and O(1) space is hard; standard merge uses O(n) extra.",
      "Linked-list merge sort can avoid array buffer costs—mention if asked about lists.",
    ],
    tryInAnalyzer: "Compare memory pressure vs heap sort on large n in your environment.",
  },
  "Linked List": {
    interviewTip:
      "Be fluent in cycle detection (Floyd), reversal, and why insert-after-node is O(1) but search is O(n).",
    pitfalls: [
      "Off-by-one on null checks and losing the head pointer are the top bugs.",
      "Do not assume O(1) random access—arrays vs lists trade-offs come up constantly.",
    ],
    tryInAnalyzer: "Implement walk vs array index to internalize access patterns.",
  },
  "Binary Search Tree (BST)": {
    interviewTip:
      "Always separate average balanced height O(log n) from skewed O(n). Know rotations / AVL / red-black at a high level.",
    pitfalls: [
      "The first wrong answer is often “binary tree” instead of the ordering invariant.",
      "Successor/predecessor edge cases (no right child) trip people up in deletes.",
    ],
    tryInAnalyzer: "Insert sorted keys without balancing to see height blow up, then contrast with shuffled order.",
  },
  Stack: {
    interviewTip:
      "Connect stacks to DFS, monotonic stack patterns, and postfix evaluation—three common interview families.",
    pitfalls: [
      "Pop on empty stack must be guarded; underflow is a classic failure mode.",
      "Recursion depth limits map to implicit stack size on some platforms.",
    ],
    tryInAnalyzer: "Trace DFS on a tiny graph with an explicit stack vs recursion.",
  },
  Queue: {
    interviewTip:
      "Queues underpin BFS, sliding windows with deque variants, and level-order tree walks.",
    pitfalls: [
      "Naive array queue with shift(0) is O(n) per dequeue in some languages—use ring buffer or deque.",
      "BFS shortest path assumes unweighted edges unless you switch algorithm.",
    ],
    tryInAnalyzer: "Layer-by-layer print of a tree mirrors BFS queue discipline.",
  },
  "Priority Queue": {
    interviewTip:
      "Tie heaps to Dijkstra and scheduling; know insert/extract-min complexities and why peek is cheap.",
    pitfalls: [
      "Decrease-key is not free on a basic binary heap API—some questions assume Fibonacci heap for theoretical bounds.",
      "Do not confuse priority queue interface with sorted array (different costs).",
    ],
    tryInAnalyzer: "Manually heapify a small array to cement sift-up / sift-down intuition.",
  },
  Trie: {
    interviewTip:
      "Prefix queries and autocomplete are standard. Discuss alphabet size vs memory explosion.",
    pitfalls: [
      "Time is O(m) per op for string length m, not O(1).",
      "Empty string and prefix-of-self edge cases matter in implementation.",
    ],
    tryInAnalyzer: "Insert overlapping prefixes (car, card, care) and trace node sharing.",
  },
  Heap: {
    interviewTip:
      "Binary heaps are complete trees stored in arrays—index arithmetic (2i+1) is interview bread and butter.",
    pitfalls: [
      "Max-heap vs min-heap orientation must match your extract API.",
      "Heapify is O(n) to build from array—do not claim only O(n log n) build.",
    ],
    tryInAnalyzer: "Draw parent/child indices for indices 0–6 on paper, then mirror in code comments.",
  },
  "Hash Table": {
    interviewTip:
      "Average O(1) vs worst O(n), load factor, resizing, and collision resolution (chaining vs open addressing) are core talking points.",
    pitfalls: [
      "Hash equality contract: if a.equals(b) then hash must match (Java-style) matters in interviews.",
      "Security: collision amplification (hash flooding) in naive string hashing.",
    ],
    tryInAnalyzer: "Think through two keys colliding in the same bucket—what breaks if you only compare hashes?",
  },
  "Dijkstra's Algorithm": {
    interviewTip:
      "Nonnegative edges only; relax in best-distance order; binary heap gives O((V+E) log V) in typical statements.",
    pitfalls: [
      "Negative edges break greedy relaxation—Bellman–Ford instead.",
      "Stale entries in the priority queue need skipping when distance already improved.",
    ],
    tryInAnalyzer: "Walk a 4-node graph on paper before coding to lock ordering of relaxations.",
  },
  "Depth-First Search (DFS)": {
    interviewTip:
      "White/gray/black coloring for cycles in directed graphs; recursion stack vs explicit stack trade-offs.",
    pitfalls: [
      "DFS does not give shortest path edge-count on unweighted graphs—BFS does.",
      "Visited set must be per component start if graph disconnected.",
    ],
    tryInAnalyzer: "Detect a back-edge on a tiny directed graph with DFS timestamps.",
  },
  "Breadth-First Search (BFS)": {
    interviewTip:
      "Layer expansion = shortest path in unweighted graphs; double-ended BFS for meet-in-the-middle on large graphs.",
    pitfalls: [
      "Queue size can spike on wide graphs—memory can dominate before time.",
      "Storing full paths vs parent pointers changes space story.",
    ],
    tryInAnalyzer: "Record distance array during BFS to reconstruct shortest path.",
  },
  Graph: {
    interviewTip:
      "Master adjacency list vs matrix: when is edge test O(1)? When is iteration O(degree)?",
    pitfalls: [
      "Directed vs undirected doubles edges in some representations.",
      "Self-loops and multi-edges change complexity statements unless excluded.",
    ],
    tryInAnalyzer: "Pick one representation and code both addEdge and neighbors for the same graph.",
  },
};

export function getTopicEnrichment(algorithmName) {
  return TOPIC_ENRICHMENTS[algorithmName] || null;
}

export const GLOSSARY_ITEMS = [
  { term: "Asymptotic notation", def: "Big-O, Theta, and Omega describe how cost grows as n grows—not exact milliseconds." },
  { term: "Stable sort", def: "Equal keys keep their original relative order; important when sorting by multiple passes (e.g. radix on strings)." },
  { term: "In-place", def: "Only O(1) extra space beyond the input storage (excluding recursion stack where applicable)." },
  { term: "Amortized", def: "Average cost per operation over a sequence—e.g. dynamic array doubling makes append amortized O(1)." },
  { term: "Recurrence", def: "Equation T(n) = a T(n/b) + f(n) describing divide-and-conquer; solved via master theorem or tree method." },
  { term: "Adjacency list", def: "Graph storage: each vertex stores a list of neighbors—O(V+E) memory, iterate edges in O(degree)." },
  { term: "Relaxation (shortest paths)", def: "If dist[u] + w(u,v) improves dist[v], update dist[v]; core of Dijkstra and Bellman–Ford." },
  { term: "Complete binary tree", def: "All levels filled except possibly the last, filled left to right—lets heaps use compact array indexing." },
  { term: "Load factor (hashing)", def: "n / m entries per bucket table size; high load increases collisions and hurts average time." },
  { term: "Partition (quicksort)", def: "Rearrange so keys < pivot sit left and keys > pivot sit right; pivot may land at its sorted index." },
];

export const STUDY_WORKFLOW_STEPS = [
  {
    title: "Skim the complexity strip",
    body: "For sorting topics, read the row in the reference table first so Big-O claims in the lesson land in context.",
  },
  {
    title: "Read outcomes, then notes",
    body: "Use learning outcomes as a checklist, then instructor notes for intuition and caveats before touching code.",
  },
  {
    title: "Watch once, implement second",
    body: "Let the visualization build mental imagery, then step through the reference snippet line by line in Implementation.",
  },
  {
    title: "Run the quiz cold",
    body: "Close the lesson tab, answer from memory, then revisit only the bullets you missed.",
  },
  {
    title: "Validate in the Analyzer",
    body: "Take the “Try in Analyzer” prompt literally—empirical curves beat memorized tables for retention.",
  },
];
