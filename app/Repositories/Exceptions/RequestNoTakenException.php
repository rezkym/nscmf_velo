<?php

declare(strict_types=1);

namespace App\Repositories\Exceptions;

use RuntimeException;

/** The normalized Request No is already used (11 §13.5 unique index). */
final class RequestNoTakenException extends RuntimeException {}
