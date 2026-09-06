// Q1A DATA4.9B recovery entrypoint.
// The earlier whole-domain CDX probe was evidence-only and over-collected historical generations.
// This entrypoint now replays only archived robots.txt + declared sitemap snapshots before the frozen cutoff.
import './candidate-lake-q1a-data49b-wayback-sitemap-recovery';
