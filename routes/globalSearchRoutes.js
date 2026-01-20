import express from 'express';
import Post from '../models/Post.js';
import Course from '../models/Course.js';
import Document from '../models/documents.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * Global search across all content types
 * GET /api/search/all?q=query&contentType=all&sort=relevance&page=1&limit=10
 */
router.get('/all', async (req, res) => {
  try {
    const {
      q = '',
      contentType = 'all',
      sort = 'relevance',
      tags = '',
      category = '',
      dateRange = 'all',
      page = 1,
      limit = 10,
    } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build search filters
    const searchRegex = new RegExp(q.trim(), 'i');
    const baseFilter = {
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { content: searchRegex },
        { tags: searchRegex },
      ],
    };

    // Add date range filter if applicable
    let dateFilter = {};
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();

      switch (dateRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      dateFilter = { date: { $gte: startDate } };
    }

    // Sort mapping
    const sortMap = {
      relevance: { score: -1 },
      date: { date: -1 },
      views: { views: -1 },
      likes: { likes: -1 },
    };

    const sortOption = sortMap[sort] || sortMap.relevance;

    let results = [];
    let totalCount = 0;

    // Search in Posts
    if (contentType === 'all' || contentType === 'post') {
      try {
        const postFilter = {
          ...baseFilter,
          ...dateFilter,
          published: true,
        };

        if (category) {
          postFilter.category = category;
        }

        if (tags) {
          postFilter.tags = { $in: tags.split(',').map((t) => new RegExp(t, 'i')) };
        }

        const postResults = await Post.find(postFilter)
          .select('_id title slug description author date tags views likes readTime category')
          .sort({ score: -1, ...sortOption })
          .limit(limitNum)
          .skip(skip)
          .exec();

        const postCount = await Post.countDocuments(postFilter);

        results.push(
          ...postResults.map((post) => ({
            ...post.toObject(),
            type: 'post',
          }))
        );

        totalCount = postCount;
      } catch (err) {
        console.error('Post search error:', err);
      }
    }

    // Search in Courses
    if (contentType === 'all' || contentType === 'course') {
      try {
        const courseFilter = {
          ...baseFilter,
          ...dateFilter,
        };

        if (category) {
          courseFilter.category = category;
        }

        const courseResults = await Course.find(courseFilter)
          .select('_id title description difficulty duration createdAt image instructor tags')
          .sort(sortOption)
          .limit(limitNum)
          .skip(skip)
          .exec();

        const courseCount = await Course.countDocuments(courseFilter);

        results.push(
          ...courseResults.map((course) => ({
            _id: course._id,
            title: course.title,
            description: course.description,
            difficulty: course.difficulty,
            duration: course.duration,
            date: course.createdAt,
            tags: course.tags || [],
            views: 0,
            likes: 0,
            type: 'course',
          }))
        );

        if (contentType === 'course') {
          totalCount = courseCount;
        }
      } catch (err) {
        console.error('Course search error:', err);
      }
    }

    // Search in Documents
    if (contentType === 'all' || contentType === 'document') {
      try {
        const documentFilter = {
          ...baseFilter,
          ...dateFilter,
        };

        if (category) {
          documentFilter.category = category;
        }

        const documentResults = await Document.find(documentFilter)
          .select('_id title description content createdAt tags category views')
          .sort(sortOption)
          .limit(limitNum)
          .skip(skip)
          .exec();

        const documentCount = await Document.countDocuments(documentFilter);

        results.push(
          ...documentResults.map((doc) => ({
            _id: doc._id,
            title: doc.title,
            description: doc.description,
            date: doc.createdAt,
            tags: doc.tags || [],
            category: doc.category,
            views: doc.views || 0,
            type: 'document',
          }))
        );

        if (contentType === 'document') {
          totalCount = documentCount;
        }
      } catch (err) {
        console.error('Document search error:', err);
      }
    }

    // Apply final sort and pagination for mixed results
    if (contentType === 'all') {
      // Sort mixed results by relevance and date
      results.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Most recent first
      });

      totalCount = results.length;
      results = results.slice(skip, skip + limitNum);
    }

    res.json({
      results,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
});

/**
 * Get search filters (categories and tags)
 * GET /api/search/filters
 */
router.get('/filters', async (req, res) => {
  try {
    const [postCategories, postTags, courseCategories, courseTags] = await Promise.all([
      Post.distinct('category'),
      Post.distinct('tags'),
      Course.distinct('category'),
      Course.distinct('tags'),
    ]);

    const allCategories = [...new Set([...postCategories, ...courseCategories])].filter(Boolean);
    const allTags = [...new Set([...postTags, ...courseTags])].filter(Boolean);

    res.json({
      categories: allCategories,
      tags: allTags,
    });
  } catch (error) {
    console.error('Error fetching search filters:', error);
    res.status(500).json({ message: 'Failed to fetch filters', error: error.message });
  }
});

export default router;
