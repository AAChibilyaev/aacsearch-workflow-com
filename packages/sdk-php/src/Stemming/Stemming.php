<?php
declare(strict_types=1);
namespace AACSearch\SDK\Stemming;
use AACSearch\SDK\ApiCall;
class Stemming { public readonly StemmingDictionaries $dictionaries; private array $im=[]; public function __construct(private readonly ApiCall $a){$this->dictionaries=new StemmingDictionaries($a);} public function retrieve():array{return $this->a->get('/stemming');} public function dictionaries(?string $id=null):StemmingDictionaries|StemmingDictionary{if($id===null)return $this->dictionaries;if(!isset($this->im[$id]))$this->im[$id]=new StemmingDictionary($id,$this->a);return $this->im[$id];} }
