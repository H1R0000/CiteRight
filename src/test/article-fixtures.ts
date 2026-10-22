import { newBook, type Book } from '../lib/model'

// APA's published journal-article example:
// https://apastyle.apa.org/style-grammar-guidelines/references/examples/journal-article-references
export const crossrefArticle = {
  type: 'journal-article',
  DOI: '10.1037/ppm0000185',
  title: [
    'Emotions in storybooks: A comparison of storybooks that represent ethnic and racial groups in the United States',
  ],
  author: [
    { given: 'J. S.', family: 'Grady' },
    { given: 'M.', family: 'Her' },
    { given: 'G.', family: 'Moreno' },
    { given: 'C.', family: 'Perez' },
    { given: 'J.', family: 'Yelinek' },
  ],
  'container-title': ['Psychology of Popular Media Culture'],
  volume: '8',
  issue: '3',
  page: '207-217',
  'published-print': { 'date-parts': [[2019, 7]] },
  'published-online': { 'date-parts': [[2018, 1]] },
  created: { 'date-parts': [[2017]] },
}
export const sampleArticle = (patch: Partial<Book> = {}): Book => ({
  ...newBook('article-journal'),
  id: 'article-example',
  title: crossrefArticle.title[0],
  authors: crossrefArticle.author.map((author) => ({ ...author, literal: '' })),
  year: '2019',
  journal: crossrefArticle['container-title'][0],
  volume: '8',
  issue: '3',
  pages: '207-217',
  doi: crossrefArticle.DOI,
  ...patch,
})

// Crossref response fields for the user-reported IEEE DOI, verified 2026-10-23.
export const crossrefConference = {
  type: 'proceedings-article',
  DOI: '10.1109/icssas66150.2025.11080972',
  title: [
    'Geo-Location based Attendance Tracking and Face Recognition System using ResNet Algorithm',
  ],
  author: [
    { given: 'Adline Freeda', family: 'R' },
    { given: 'Kruthika', family: 'S' },
    { given: 'Hemapriya', family: 'A' },
    { given: 'Jeffry Shiny', family: 'S' },
    { given: 'Narendran', family: 'M' },
    { given: 'Anju', family: 'A' },
  ],
  'container-title': [
    '2025 3rd International Conference on Self Sustainable Artificial Intelligence Systems (ICSSAS)',
  ],
  publisher: 'IEEE',
  page: '141-148',
  published: { 'date-parts': [[2025, 6, 11]] },
}
