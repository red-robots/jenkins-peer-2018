<?php
/**
 * The Header template for our theme
 *
 * Displays all of the <head> section and everything up till <div id="main">
 *
 * @package WordPress
 * @subpackage Twenty_Twelve
 * @since Twenty Twelve 1.0
 */
?><!DOCTYPE html>
<!--[if IE 7]>
<html class="ie ie7" <?php language_attributes(); ?>>
<![endif]-->
<!--[if IE 8]>
<html class="ie ie8" <?php language_attributes(); ?>>
<![endif]-->
<!--[if !(IE 7) | !(IE 8)  ]><!-->
<html <?php language_attributes(); ?>>
<!--<![endif]-->
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>" />
<meta name="viewport" content="width=device-width" />


<?php if( is_single( 2747 ) ) { ?>
	<meta name="robots" content="noindex">
	<!-- We're blocking only her -->
<?php } ?>


<title><?php wp_title( '|', true, 'right' ); ?></title>
<link rel="profile" href="http://gmpg.org/xfn/11" />
<link rel="pingback" href="<?php bloginfo( 'pingback_url' ); ?>" />
<link rel="stylesheet" href="<?php bloginfo( 'template_url' ); ?>/css/basic.css" type="text/css" />
<link rel="stylesheet" href="<?php bloginfo( 'template_url' ); ?>/css/gallerificPlus.css" type="text/css" />
<?php // Loads HTML5 JavaScript file to add support for HTML5 elements in older IE versions. ?>

<!--[if lt IE 9]>
<script src="<?php echo get_template_directory_uri(); ?>/js/html5.js" type="text/javascript"></script>
<![endif]-->
<script type="text/javascript">
<!--
var template_url = "<?php bloginfo('template_url'); ?>";
// -->
</script>
<?php wp_head(); ?>
<script type="text/javascript">
	document.write("<style type='text/css'>div.navigation{width:300px;float: left;}div.content{display:block;}</style>");
</script>
	
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-132474660-1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-132474660-1');
</script>
<script defer src="<?php bloginfo( 'template_url' ); ?>/assets/svg-with-js/js/fontawesome-all.min.js"></script>
	
	
</head>

<?php 
	$ann_toggle = get_field('ann_toggle', 'option');
	$ann_copy = get_field('ann_copy', 'option');
 ?>

<body <?php body_class(); ?>>
	<?php if( $ann_toggle == 'on' ) { ?>
		<div class="announcement">
			<?php echo $ann_copy; ?>
		</div>
	<?php } ?>
<div id="page" class="pagewrap clear">
	<div id="header" class="header-wrapper wrapper clear">
    	<div class="row clear">
    		<div class="left-column">
    			<?php $tagLine = get_field('logo_subtext', 'option'); ?>
				<div class="logo" ><a href="<?php bloginfo('url'); ?>"><img src="<?php bloginfo('template_url'); ?>/images/logo.png" alt="<?php bloginfo('name'); ?>" /></a>

		            	<?php if($tagLine){
			            	echo $tagLine;
			            } ?>
		        </div>
	        </div>

	        <div class="right-column">
				<nav id="site-navigation" class="main-navigation" role="navigation">
					<span class="menu-toggle"><span id="toggleMenu"><?php _e( 'Menu', 'twentytwelve' ); ?><i></i></span></span>
					
					<?php wp_nav_menu( array( 'theme_location' => 'primary', 'menu_class' => 'nav-menu','container_class'=>'main-menu-wrapper' ) ); ?>
				</nav><!-- #site-navigation -->
			</div>
		</div>

	</div><!-- #header -->

	<?php if (is_home() || is_front_page()) { ?>
		<?php get_template_part('inc/featured-projects'); ?>
	<?php } else { ?>
		<?php get_template_part('inc/subpage-banner'); ?>
	<?php } ?>

<div class="page-container wrapper">
