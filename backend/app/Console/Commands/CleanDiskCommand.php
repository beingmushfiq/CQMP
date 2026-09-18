<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class CleanDiskCommand extends Command
{
    protected $signature = 'app:clean-disk {--dry-run : Only list large files without deleting}';
    protected $description = 'Diagnose abnormal disk usage, truncate runaway log files, and delete leftover archives/caches';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $this->info("=================================================");
        $this->info(" CQMP Disk Cleanup & Diagnostic Tool");
        $this->info(" Mode: " . ($dryRun ? "DRY RUN (Report Only)" : "LIVE CLEANUP"));
        $this->info("=================================================");

        $totalBytesFreed = 0;

        // 1. Scan storage/logs
        $logDir = storage_path('logs');
        $this->newLine();
        $this->info("1. Inspecting storage/logs...");
        if (File::isDirectory($logDir)) {
            $logs = File::files($logDir);
            foreach ($logs as $log) {
                $bytes = $log->getSize();
                $humanSize = $this->formatBytes($bytes);
                $this->line("   - {$log->getFilename()}: <comment>{$humanSize}</comment>");

                if (!$dryRun && $bytes > 0) {
                    // Truncate file rather than delete to preserve open file handles
                    file_put_contents($log->getRealPath(), '');
                    $totalBytesFreed += $bytes;
                    $this->line("     <info>✓ Truncated to 0 bytes</info>");
                }
            }
        }

        // 2. Scan for error_log in base_path, public_path, and parent path
        $this->newLine();
        $this->info("2. Inspecting PHP/Apache error_log files...");
        $searchDirs = [
            base_path(),
            public_path(),
            dirname(base_path()), // public_html or user root
        ];

        foreach (array_unique($searchDirs) as $dir) {
            if (!File::isDirectory($dir)) continue;
            $errFile = $dir . DIRECTORY_SEPARATOR . 'error_log';
            if (File::isFile($errFile)) {
                $bytes = filesize($errFile);
                $humanSize = $this->formatBytes($bytes);
                $this->line("   - Found error_log at {$errFile}: <comment>{$humanSize}</comment>");
                if (!$dryRun && $bytes > 0) {
                    file_put_contents($errFile, '');
                    $totalBytesFreed += $bytes;
                    $this->line("     <info>✓ Truncated to 0 bytes</info>");
                }
            }
        }

        // 3. Scan for leftover zip / tar archives in base and parent
        $this->newLine();
        $this->info("3. Inspecting for leftover deployment archives (.zip, .tar.gz)...");
        foreach (array_unique($searchDirs) as $dir) {
            if (!File::isDirectory($dir)) continue;
            try {
                $files = File::files($dir);
                foreach ($files as $file) {
                    $ext = strtolower($file->getExtension());
                    if (in_array($ext, ['zip', 'gz', 'tar', 'tgz', 'rar', 'bak'])) {
                        $bytes = $file->getSize();
                        $humanSize = $this->formatBytes($bytes);
                        $this->line("   - Found archive: {$file->getFilename()} in {$dir} (<comment>{$humanSize}</comment>)");
                        if (!$dryRun) {
                            File::delete($file->getRealPath());
                            $totalBytesFreed += $bytes;
                            $this->line("     <info>✓ Deleted archive file</info>");
                        }
                    }
                }
            } catch (\Throwable $e) {
                $this->warn("   Could not scan $dir: " . $e->getMessage());
            }
        }

        // 4. Framework caches
        $this->newLine();
        $this->info("4. Cleaning framework caches & compiled templates...");
        if (!$dryRun) {
            $viewsDir = storage_path('framework/views');
            if (File::isDirectory($viewsDir)) {
                $viewFiles = File::files($viewsDir);
                foreach ($viewFiles as $vf) {
                    if ($vf->getExtension() === 'php') {
                        $totalBytesFreed += $vf->getSize();
                        File::delete($vf->getRealPath());
                    }
                }
                $this->line("   <info>✓ Cleared compiled blade views</info>");
            }

            $cacheDataDir = storage_path('framework/cache/data');
            if (File::isDirectory($cacheDataDir)) {
                File::cleanDirectory($cacheDataDir);
                $this->line("   <info>✓ Cleared framework file cache</info>");
            }
        }

        $this->newLine();
        $this->info("=================================================");
        $freedHuman = $this->formatBytes($totalBytesFreed);
        $this->info(" Done! Total space recovered: {$freedHuman}");
        $this->info("=================================================");

        return Command::SUCCESS;
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' B';
    }
}
