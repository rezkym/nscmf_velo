<?php

declare(strict_types=1);

namespace App\Infrastructure\Workbook;

use DOMDocument;
use DOMElement;
use DOMXPath;
use ZipArchive;

/**
 * Shared OOXML primitives of the targeted workbook patchers: member access, styled-cell lookup,
 * native checkbox ticking and the post-patch package validation. Never a generic rewrite.
 */
final class OoxmlPackage
{
    public const string MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    public static function member(ZipArchive $zip, string $name): string
    {
        $content = $zip->getFromName($name);
        if ($content === false) {
            throw new WorkbookPatchFailed("Template member {$name} is missing.");
        }

        return $content;
    }

    public static function load(string $xml): DOMDocument
    {
        $document = new DOMDocument;
        $document->preserveWhiteSpace = true;
        if (! $document->loadXML($xml)) {
            throw new WorkbookPatchFailed('The worksheet XML is malformed.');
        }

        return $document;
    }

    public static function xpath(DOMDocument $document): DOMXPath
    {
        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('m', self::MAIN);

        return $xpath;
    }

    /** Replaces the cell's content with an inline string, keeping its style. */
    public static function writeText(DOMDocument $document, DOMXPath $xpath, string $reference, string $text): void
    {
        $cell = self::emptied($document, $xpath, $reference);
        $cell->setAttribute('t', 'inlineStr');
        $inline = $document->createElementNS(self::MAIN, 'is');
        $value = $document->createElementNS(self::MAIN, 't');
        $value->setAttribute('xml:space', 'preserve');
        $value->appendChild($document->createTextNode(self::xmlSafe($text)));
        $inline->appendChild($value);
        $cell->appendChild($inline);
    }

    /** Replaces the cell's content with a number (a date serial keeps the cell's date format). */
    public static function writeNumber(DOMDocument $document, DOMXPath $xpath, string $reference, int|float $number): void
    {
        $cell = self::emptied($document, $xpath, $reference);
        $cell->removeAttribute('t');
        $cell->appendChild($document->createElementNS(self::MAIN, 'v', (string) $number));
    }

    public static function first(DOMXPath $xpath, string $query): ?DOMElement
    {
        $nodes = $xpath->query($query);
        $node = $nodes === false ? null : $nodes->item(0);

        return $node instanceof DOMElement ? $node : null;
    }

    public static function columnIndex(string $reference): int
    {
        $index = 0;
        foreach (str_split((string) preg_replace('/\d+/', '', $reference)) as $letter) {
            $index = $index * 26 + ord($letter) - 64;
        }

        return $index;
    }

    public static function checkCtrlProp(string $xml): string
    {
        return str_contains($xml, 'checked="Checked"') ? $xml : (string) preg_replace('/<formControlPr /', '<formControlPr checked="Checked" ', $xml, 1);
    }

    public static function checkShape(string $vml, int $shapeId): string
    {
        $pattern = '/(<v:shape id="_x0000_s'.$shapeId.'".*?<x:ClientData ObjectType="Checkbox">)(.*?)(<\/x:ClientData>)/s';
        $patched = (string) preg_replace_callback($pattern, fn (array $m): string => $m[1].(str_contains($m[2], '<x:Checked>') ? $m[2] : $m[2].'<x:Checked>1</x:Checked>').$m[3], $vml, 1, $count);
        if ($count !== 1) {
            throw new WorkbookPatchFailed("Checkbox shape {$shapeId} is missing from the template.");
        }

        return $patched;
    }

    /** Characters XML 1.0 cannot carry are dropped rather than corrupting the sheet. */
    public static function xmlSafe(string $text): string
    {
        return (string) preg_replace('/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u', '', $text);
    }

    /**
     * The same member list, every unowned member byte-identical, every owned XML well formed.
     *
     * @param  list<string>  $owned
     */
    public static function validate(string $templatePath, string $outputPath, array $owned): void
    {
        $original = new ZipArchive;
        $patched = new ZipArchive;
        if ($original->open($templatePath) !== true || $patched->open($outputPath) !== true || $original->numFiles !== $patched->numFiles) {
            throw new WorkbookPatchFailed('The patched workbook lost or gained package members.');
        }

        try {
            for ($index = 0; $index < $original->numFiles; $index++) {
                $name = (string) $original->getNameIndex($index);
                $after = $patched->getFromName($name);
                if ($after === false) {
                    throw new WorkbookPatchFailed("Member {$name} is missing after patching.");
                }
                if (in_array($name, $owned, true)) {
                    if (! str_ends_with($name, '.vml') && @simplexml_load_string($after) === false) {
                        throw new WorkbookPatchFailed("Member {$name} is not well-formed XML after patching.");
                    }
                } elseif ($after !== $original->getFromName($name)) {
                    throw new WorkbookPatchFailed("Unowned member {$name} changed during patching.");
                }
            }
        } finally {
            $original->close();
            $patched->close();
        }
    }

    /** The existing (styled) cell element with its content removed, or a new one in column order. */
    private static function emptied(DOMDocument $document, DOMXPath $xpath, string $reference): DOMElement
    {
        $cell = self::first($xpath, "//m:sheetData/m:row/m:c[@r='{$reference}']") ?? self::inserted($document, $xpath, $reference);
        while ($cell->firstChild !== null) {
            $cell->removeChild($cell->firstChild);
        }

        return $cell;
    }

    private static function inserted(DOMDocument $document, DOMXPath $xpath, string $reference): DOMElement
    {
        $rowNumber = (string) preg_replace('/^[A-Z]+/', '', $reference);
        $row = self::first($xpath, "//m:sheetData/m:row[@r='{$rowNumber}']");
        if (! $row instanceof DOMElement) {
            throw new WorkbookPatchFailed("Mapped row {$rowNumber} is missing from the template.");
        }
        $cell = $document->createElementNS(self::MAIN, 'c');
        $cell->setAttribute('r', $reference);
        foreach ($row->childNodes as $sibling) {
            if ($sibling instanceof DOMElement && self::columnIndex($sibling->getAttribute('r')) > self::columnIndex($reference)) {
                return $row->insertBefore($cell, $sibling);
            }
        }

        return $row->appendChild($cell);
    }
}
